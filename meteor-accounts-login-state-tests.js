"use strict";
/* globals LoginState */

Tinytest.add('LoginState - loggingIn', function (test) {
  var meteorLoggingIn = Meteor.loggingIn;
  var meteorLoggingInCalled = false;
  var meteorLoggingInReturnedValue = {}; // Not realistic but useful for testing
  try {
    Meteor.loggingIn = function () {
      test.equal(this, Meteor, 'this != Meteor');
      meteorLoggingInCalled = true;
      return meteorLoggingInReturnedValue;
    };
    var TestLoginState = new LoginState.constructor();
    test.equal(TestLoginState.loggingIn(), meteorLoggingInReturnedValue,
      "Incorrect returned value");
    test.isTrue(meteorLoggingInCalled, 'Meteor.logggingIn not called');
  } finally {
    Meteor.loggingIn = meteorLoggingIn;
  }
});

Tinytest.add('LoginState - loggedIn', function (test) {
  var meteorUserId = Meteor.userId;
  var meteorUserIdReturnedValue = new ReactiveVar();
  var stopper;
  var runCount = 0;
  var loggedInResult;
  try {
    Meteor.userId = function () {
      return meteorUserIdReturnedValue.get();
    };
    var TestLoginState = new LoginState.constructor();
    stopper = Tracker.autorun(function () {
      runCount++;
      loggedInResult = TestLoginState.loggedIn();
    });
    meteorUserIdReturnedValue.set(undefined);
    Tracker.flush();
    test.isFalse(loggedInResult, 'undefined');
    test.equal(runCount, 1);

    meteorUserIdReturnedValue.set(null);
    Tracker.flush();
    test.isFalse(loggedInResult, 'null');
    test.equal(runCount, 1);

    meteorUserIdReturnedValue.set("testuserid");
    Tracker.flush();
    test.isTrue(loggedInResult);
    test.equal(runCount, 2);

    meteorUserIdReturnedValue.set("testuserid2");
    Tracker.flush();
    test.isTrue(loggedInResult);
    test.equal(runCount, 2);

    meteorUserIdReturnedValue.set(null);
    Tracker.flush();
    test.isFalse(loggedInResult);
    test.equal(runCount, 3);
  } finally {
    Meteor.userId = meteorUserId;
    stopper.stop();
  }
});

Tinytest.add('LoginState - signedUp', function (test) {
  var meteorUserId = Meteor.userId;
  var meteorUserIdReturnedValue = new ReactiveVar();
  var meteorUser = Meteor.user;
  var meteorUserReturnedValue = new ReactiveVar({}, function usersEqual(a, b) {
    return EJSON.stringify(a) === EJSON.stringify(b);
  });
  var stopper;
  var runCount = 0;
  var signedUpResult;
  try {
    Meteor.userId = function () {
      return meteorUserIdReturnedValue.get();
    };
    Meteor.user = function () {
      return meteorUserReturnedValue.get();
    };
    var TestLoginState = new LoginState.constructor();
    stopper = Tracker.autorun(function () {
      runCount++;
      signedUpResult = TestLoginState.signedUp();
    });
    meteorUserIdReturnedValue.set(null);
    meteorUserReturnedValue.set(null);
    Tracker.flush();
    test.isFalse(signedUpResult, 'null');
    test.equal(runCount, 1);

    var user = {
      services: {
        resume: {
          loginTokens: [
            {
              when: {
                "$date": 1440482363775
              },
              hashedToken: "hashedtokenvalue"
            }
          ]
        }
      }
    };
    meteorUserIdReturnedValue.set("testuserid");
    meteorUserReturnedValue.set(_.clone(user));
    Tracker.flush();
    test.isFalse(signedUpResult, 'only resume service');
    test.equal(runCount, 1);

    user.profile = {
      name: "Test User"
    };
    meteorUserReturnedValue.set(_.clone(user));
    Tracker.flush();
    test.isTrue(signedUpResult, "profile.name set");
    test.equal(runCount, 2);
    delete user.profile;

    user.services.password = {
      bcrypt: "bcrypted password"
    };
    user.emails = [
      {
        address: "test@example.com",
        verified: false
      }
    ];
    meteorUserReturnedValue.set(_.clone(user));
    Tracker.flush();
    test.isTrue(signedUpResult, "emails set");
    test.equal(runCount, 2);
    delete user.emails;

    user.username = "testusername";
    meteorUserReturnedValue.set(_.clone(user));
    Tracker.flush();
    test.isTrue(signedUpResult, "username set");
    test.equal(runCount, 2);

    user.profile = {
      guest: true
    };
    meteorUserReturnedValue.set(_.clone(user));
    Tracker.flush();
    test.isTrue(signedUpResult, "guest: true without callback");
    test.equal(runCount, 2);

    // Register a callback that says users with profile.guest === true are
    // not signed in.
    TestLoginState.addSignedUpInterceptor(function (info) {
      var u = Meteor.user();
      if (u && u.profile && u.profile.guest && u.profile.guest === true) {
        info.signedUp = false;
      }
    });
    Tracker.flush();
    test.isFalse(signedUpResult, "guest: true with callback");
    test.equal(runCount, 3);

    delete user.username;
    delete user.services.password;
  } finally {
    Meteor.userId = meteorUserId;
    Meteor.user = meteorUser;
    stopper.stop();
  }
});
