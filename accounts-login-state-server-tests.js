"use strict";
/* globals ServiceConfiguration, LoginState */

var guestInterceptorStopper;

Meteor.methods({
  ALS_addService: function (name) {
    ServiceConfiguration.configurations.upsert({
      service: name
    }, {
      $set: {
        service: name
      }
    });
  },
  ALS_removeService: function (name) {
    ServiceConfiguration.configurations.remove({
      service: name
    });
  },
  ALS_removeUser: function (username) {
    Meteor.users.remove({ username: username });
  },
  ALS_addInterceptorForGuest: function () {
    guestInterceptorStopper = LoginState.addSignedUpInterceptor(function (u) {
      if (u.services && u.services.password && u.profile && u.profile.guest) {
        u.loginStateSignedUp = false;
      }
    });
  },
  ALS_removeInterceptorForGuest: function () {
    if (guestInterceptorStopper) {
      guestInterceptorStopper.stop();
    }
  },
  ALS_waitForChangedCallbacksToComplete: function () {
    // Do a dummy update to the user. The client will not return or call it's
    // callback until any triggered "changed" callbacks complete.
    Meteor.users.update({
      _id: this.userId
    }, {
      $set: {
        profile: {
          dummyProp: "dummy value"
        }
      }
    });
  }
});



var meteorUser = Meteor.user;

Tinytest.add('LoginState - signedUp', function (test) {
  var meteorUserReturnedValue;
  var TestLoginState;
  Meteor.user = function () {
    return meteorUserReturnedValue;
  };
  TestLoginState = new LoginState.constructor();
  meteorUserReturnedValue = null;
  test.isFalse(TestLoginState.signedUp(), 'not logged in');

  meteorUserReturnedValue = {
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
  test.isFalse(TestLoginState.signedUp(), 'only resume service');

  meteorUserReturnedValue.profile = {
    name: "Test User"
  };
  test.isFalse(TestLoginState.signedUp(), "profile.name set");
  delete meteorUserReturnedValue.profile;

  meteorUserReturnedValue.services.password = {
    bcrypt: "bcrypted password"
  };
  meteorUserReturnedValue.emails = [{
    address: "test@example.com",
    verified: false
  }];
  test.isTrue(TestLoginState.signedUp(), "emails set");
  delete meteorUserReturnedValue.emails;

  meteorUserReturnedValue.username = "testusername";
  test.isTrue(TestLoginState.signedUp(), "username set");

  meteorUserReturnedValue.profile = {
    guest: true
  };
  test.isTrue(TestLoginState.signedUp(), "guest: true without interceptor");

  // Register an interceptor that says users with profile.guest === true are
  // not signed in.
  var suiStopper = TestLoginState.addSignedUpInterceptor(function (u) {
    if (u.profile && u.profile.guest) {
      u.loginStateSignedUp = false;
    }
  });
  test.isFalse(TestLoginState.signedUp(), "guest: true with interceptor");

  delete meteorUserReturnedValue.username;
  delete meteorUserReturnedValue.services.password;

  Meteor.user = meteorUser;
  suiStopper.stop();
});

// If the the server deletes the user before the "changed" callback is called,
// that shouldn't cause the callback to throw an error
Tinytest.add('LoginState - change and delete logged in user', function (test) {
  // Create a connection, and use it to login as a new user
  Meteor.users.remove({ 'services.test1.name': "testuser" });
  var connection = DDP.connect(Meteor.absoluteUrl());
  var userId = connection.call('login', {
    test1: "testuser"
  }).id;
  test.isNotUndefined(userId);
  test.isNotNull(userId);

  // Spy on console.log
  var consoleLog = console.log;
  console.log = function (/* arguments */) {
    test.fail("console.log called, check terminal for output");
    consoleLog.apply(console, arguments);
  };

  // Update the logged in user and then remove them. This will cause the
  // "changed" callback associated with client's subscription to eventually be
  // called.
  var numUpdated = Meteor.users.update(userId, {
    $set: {
      profile: {
        testProperty: "test value"
      }
    }
  });
  test.equal(numUpdated, 1);
  Meteor.users.remove(userId);

  // Wait for the change callback to be called. We do that by having the client
  // make a method call requesting a dummy change, because method calls don't
  // return until the DB has been updated and associated callbacks called.
  connection.call('ALS_waitForChangedCallbacksToComplete');

  // Stop spying on console.log
  console.log = consoleLog;
});
