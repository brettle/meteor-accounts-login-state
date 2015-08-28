"use strict";
/* globals LoginState */

var meteorUserId = Meteor.userId;
var meteorUser = Meteor.user;
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
  var meteorUserIdReturnedValue = new ReactiveVar();
  var stopper;
  var runCount = 0;
  var loggedInResult;
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

  Meteor.userId = meteorUserId;
  stopper.stop();
});

Tinytest.add('LoginState - signedUp', function (test) {
  var stopper;
  var meteorUserIdReturnedValue, meteorUserReturnedValue;
  var TestLoginState;
  meteorUserId = Meteor.userId;
  meteorUserIdReturnedValue = new ReactiveVar();
  meteorUserReturnedValue = new ReactiveVar({}, function usersEqual(a, b) {
    return EJSON.stringify(a) === EJSON.stringify(b);
  });
  var runCount = 0;
  var expectedRunCount = 0;
  var signedUpResult;
  Meteor.userId = function () {
    return meteorUserIdReturnedValue.get();
  };
  Meteor.user = function () {
    return meteorUserReturnedValue.get();
  };
  TestLoginState = new LoginState.constructor();
  stopper = Tracker.autorun(function () {
    runCount++;
    signedUpResult = TestLoginState.signedUp();
  });
  meteorUserIdReturnedValue.set(null);
  meteorUserReturnedValue.set(null);
  Tracker.flush();
  expectedRunCount++;
  test.isFalse(signedUpResult, 'null');
  test.equal(runCount, expectedRunCount);

  var user = {
    services: {
      resume: {
        loginTokens: [{
          when: {
            "$date": 1440482363775
          },
          hashedToken: "hashedtokenvalue"
        }]
      }
    }
  };
  meteorUserIdReturnedValue.set("testuserid");
  meteorUserReturnedValue.set(EJSON.clone(user));
  Tracker.flush();
  test.isFalse(signedUpResult, 'only resume service');
  test.equal(runCount, expectedRunCount);

  user.profile = {
    name: "Test User"
  };
  meteorUserReturnedValue.set(EJSON.clone(user));
  Tracker.flush();
  test.isFalse(signedUpResult, "profile.name set");
  test.equal(runCount, expectedRunCount);
  delete user.profile;

  user.LoginState = {
    signedUpWithConfiguredService: true
  };
  meteorUserReturnedValue.set(EJSON.clone(user));
  Tracker.flush();
  expectedRunCount++;
  test.isTrue(signedUpResult, "LoginState.signedUpWithConfiguredService=true");
  test.equal(runCount, expectedRunCount);

  user.LoginState.signedUpWithConfiguredService = false;
  meteorUserReturnedValue.set(EJSON.clone(user));
  Tracker.flush();
  expectedRunCount++;
  test.isFalse(signedUpResult,
    "LoginState.signedUpWithConfiguredService=false");
  test.equal(runCount, expectedRunCount);

  user.services.password = {
    bcrypt: "bcrypted password"
  };
  user.emails = [{
    address: "test@example.com",
    verified: false
  }];
  meteorUserReturnedValue.set(EJSON.clone(user));
  Tracker.flush();
  expectedRunCount++;
  test.isTrue(signedUpResult, "emails set");
  test.equal(runCount, expectedRunCount);
  delete user.emails;

  user.username = "testusername";
  meteorUserReturnedValue.set(EJSON.clone(user));
  Tracker.flush();
  test.isTrue(signedUpResult, "username set");
  test.equal(runCount, expectedRunCount);

  user.profile = {
    guest: true
  };
  meteorUserReturnedValue.set(EJSON.clone(user));
  Tracker.flush();
  test.isTrue(signedUpResult, "guest: true without callback");
  test.equal(runCount, expectedRunCount);

  // Register a callback that says users with profile.guest === true are
  // not signed in.
  var suiStopper = TestLoginState.addSignedUpInterceptor(function (info) {
    var u = Meteor.user();
    if (u && u.profile && u.profile.guest && u.profile.guest === true) {
      info.signedUp = false;
    }
  });
  Tracker.flush();
  expectedRunCount++;
  test.isFalse(signedUpResult, "guest: true with callback");
  test.equal(runCount, expectedRunCount);

  delete user.username;
  delete user.services.password;

  Meteor.userId = meteorUserId;
  Meteor.user = meteorUser;
  suiStopper.stop();
  stopper.stop();
});


Tinytest.addAsync('LoginState - signedUp acceptance', function (test, done) {
  var runCount, expectedRunCount;
  var signedUpResult;
  var TestLoginState = new LoginState.constructor();
  runCount = expectedRunCount = 0;
  var stopper = Tracker.autorun(function () {
    runCount++;
    signedUpResult = TestLoginState.signedUp();
  });
  expectedRunCount++;
  Meteor.logout(function (error) {
    test.isUndefined(error, 'logout failed');
    Tracker.flush();
    test.isFalse(signedUpResult, "logged out");
    test.equal(runCount, expectedRunCount);
    loginWithTest1();
  });

  function loginWithTest1() {
    var onLoginStopper = Accounts.onLogin(function () {
      onLoginStopper.stop();
      Tracker.flush();
      test.isFalse(signedUpResult, "using unconfigured service");
      test.equal(runCount, expectedRunCount);

      configureTest1();
    });
    Accounts.callLoginMethod({
      methodArguments: [{
        test1: 'testname'
      }]
    });
  }

  function configureTest1() {
    Meteor.call('addService', 'test1', function () {
      Tracker.flush();
      expectedRunCount++;
      test.isTrue(signedUpResult, "using configured service");
      test.equal(runCount, expectedRunCount);
      loginWithConfiguredTest1();
    });
  }

  function loginWithConfiguredTest1() {
    var onLoginStopper = Accounts.onLogin(function () {
      onLoginStopper.stop();
      Tracker.flush();
      test.isTrue(signedUpResult,
        "using configured service, new user");
      test.equal(runCount, expectedRunCount);

      Meteor.call('removeService', 'test1');
      stopper.stop();
      done();
    });
    Accounts.callLoginMethod({
      methodArguments: [{
        test1: 'testname2'
      }]
    });
  }
});
