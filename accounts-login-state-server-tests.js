"use strict";
/* globals ServiceConfiguration, LoginState */

var guestInterceptorStopper;

Meteor.methods({
  addService: function (name) {
    ServiceConfiguration.configurations.upsert({
      service: name
    }, {
      $set: {
        service: name
      }
    });
  },
  removeService: function (name) {
    ServiceConfiguration.configurations.remove({
      service: name
    });
  },
  removeUser: function (username) {
    Meteor.users.remove({ username: username });
  },
  addInterceptorForGuest: function () {
    guestInterceptorStopper = LoginState.addSignedUpInterceptor(function (u) {
      if (u.services && u.services.password && u.profile && u.profile.guest) {
        u.loginStateSignedUp = false;
      }
    });
  },
  removeInterceptorForGuest: function () {
    if (guestInterceptorStopper) {
      guestInterceptorStopper.stop();
    }
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
