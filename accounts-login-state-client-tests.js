"use strict";
/* globals LoginState */

var AccountsTestingSupport =
  Package["brettle:accounts-testing-support"].AccountsTestingSupport;
var meteorUserId = Meteor.userId;
var meteorUser = Meteor.user;

Tinytest.add('LoginState - loggedIn', function (test) {
  var meteorUserIdReturnedValue = new ReactiveVar();
  var stopper;
  var loggedInResult;
  Meteor.userId = function () {
    return meteorUserIdReturnedValue.get();
  };
  var TestLoginState = new LoginState.constructor();
  stopper = Tracker.autorun(function () {
    loggedInResult = TestLoginState.loggedIn();
  });
  meteorUserIdReturnedValue.set(undefined);
  Tracker.flush();
  test.isFalse(loggedInResult, 'undefined');

  meteorUserIdReturnedValue.set(null);
  Tracker.flush();
  test.isFalse(loggedInResult, 'null');

  meteorUserIdReturnedValue.set("testuserid");
  Tracker.flush();
  test.isTrue(loggedInResult);

  meteorUserIdReturnedValue.set("testuserid2");
  Tracker.flush();
  test.isTrue(loggedInResult);

  meteorUserIdReturnedValue.set(null);
  Tracker.flush();
  test.isFalse(loggedInResult);

  Meteor.userId = meteorUserId;
  stopper.stop();
});

Tinytest.add('LoginState - signedUp unit test', function (test) {
  var stopper;
  var meteorUserIdReturnedValue, meteorUserReturnedValue;
  var TestLoginState;
  meteorUserId = Meteor.userId;
  meteorUserIdReturnedValue = new ReactiveVar();
  meteorUserReturnedValue = new ReactiveVar({}, function usersEqual(a, b) {
    return EJSON.stringify(a) === EJSON.stringify(b);
  });
  var signedUpResult;
  Meteor.userId = function () {
    return meteorUserIdReturnedValue.get();
  };
  Meteor.user = function () {
    return meteorUserReturnedValue.get();
  };
  TestLoginState = new LoginState.constructor();
  stopper = Tracker.autorun(function () {
    signedUpResult = TestLoginState.signedUp();
  });
  meteorUserIdReturnedValue.set(null);
  meteorUserReturnedValue.set(null);
  Tracker.flush();
  test.isFalse(signedUpResult, 'not logged in');

  var user = {
  };
  meteorUserIdReturnedValue.set("testuserid");
  meteorUserReturnedValue.set(EJSON.clone(user));
  Tracker.flush();
  test.isFalse(signedUpResult, "loginStateSignedUp undefined");

  user.loginStateSignedUp = true;
  meteorUserReturnedValue.set(EJSON.clone(user));
  Tracker.flush();
  test.isTrue(signedUpResult, "loginStateSignedUp === true");

  user.loginStateSignedUp = false;
  meteorUserReturnedValue.set(EJSON.clone(user));
  Tracker.flush();
  test.isFalse(signedUpResult, "loginStateSignedUp === false");

  Meteor.userId = meteorUserId;
  Meteor.user = meteorUser;
  stopper.stop();
});


Tinytest.addAsync('LoginState - signedUp accept test', function (test, done) {
  var signedUpResult;
  var TestLoginState = new LoginState.constructor();
  var stopper;

  Meteor.logout(function (error) {
    test.isUndefined(error, 'logout failed');
    Tracker.flush();
    stopper = Tracker.autorun(function () {
      signedUpResult = TestLoginState.signedUp();
    });
    test.isFalse(signedUpResult, "logged out");
    loginWithTest1();
  });

  function loginWithTest1() {
    AccountsTestingSupport.login("test1", "testname", {}, function (error) {
      test.isUndefined(error, 'login failed');
      Tracker.flush();
      test.isFalse(signedUpResult, "using unconfigured service");
      configureTest1();
    });
  }

  function configureTest1() {
    Meteor.call('ALS_addService', 'test1', function (error) {
      test.isUndefined(error, 'addService failed');
      Tracker.flush();
      test.isTrue(signedUpResult, "using configured service");
      loginWithConfiguredTest1();
    });
  }

  function loginWithConfiguredTest1() {
    AccountsTestingSupport.login("test1", "testname2", {}, function (error) {
      test.isUndefined(error, 'login with configured service failed');
      Tracker.flush();
      test.isTrue(signedUpResult, "using configured service, new user");
      unconfigureTest1();
    });
  }

  function unconfigureTest1() {
    Meteor.call('ALS_removeService', 'test1', function (error) {
      test.isUndefined(error, 'removeService failed');
      Tracker.flush();
      test.isFalse(signedUpResult, "using newly unconfigured service");
      removePasswordUser();
    });
  }

  function removePasswordUser() {
    Meteor.call('ALS_removeUser', 'guest', function (error) {
      test.isUndefined(error, 'removeUser failed');
      removeInterceptorForGuest();
    });
  }

  function removeInterceptorForGuest() {
    Meteor.call('ALS_removeInterceptorForGuest', function (error) {
      test.isUndefined(error, 'removeInterceptorForGuest failed');
      createGuestPasswordUser();
    });
  }

  function createGuestPasswordUser() {
    var options = {
      username: "guest",
      email: "email",
      password: "password",
      profile: {
        guest: true
      }
    };

    Accounts.createUser(options, function (error) {
      test.isUndefined(error, 'createUser failed');
      Tracker.flush();
      test.isTrue(signedUpResult,
        "using guest password user without interceptor");
      addInterceptorForGuest();
    });
  }

  function addInterceptorForGuest() {
    Meteor.call('ALS_addInterceptorForGuest', function (error) {
      test.isUndefined(error, 'addInterceptorForGuest failed');
      Tracker.flush();
      test.isFalse(signedUpResult,
        "using guest password user with interceptor");
      logoutOfGuest();
    });
  }

  function logoutOfGuest() {
    Meteor.logout(function (error) {
      test.isUndefined(error, 'logout of guest failed');
      Tracker.flush();
      test.isFalse(signedUpResult, "logged out after logout of guest");
      loginAsGuest();
    });
  }

  function loginAsGuest() {
    Meteor.loginWithPassword("guest", "password", function (error) {
      test.isUndefined(error, 'login of guest failed');
      Tracker.flush();
      test.isFalse(signedUpResult, "after logging in as guest");
      cleanUp();
    });
  }

  function cleanUp() {
    Meteor.call('ALS_removeInterceptorForGuest', function (error) {
      test.isUndefined(error, 'removeInterceptorForGuest failed in cleanUp');
      stopper.stop();
      done();
    });
  }
});
