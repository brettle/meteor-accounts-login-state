"use strict";
/* globals LoginState */

var AccountsTestingSupport =
  Package["brettle:accounts-testing-support"].AccountsTestingSupport;
var meteorUserId = Meteor.userId;
var meteorUser = Meteor.user;

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

Tinytest.add('LoginState - signedUp unit test', function (test) {
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
  test.isFalse(signedUpResult, 'not logged in');
  test.equal(runCount, expectedRunCount);

  var user = {
  };
  meteorUserIdReturnedValue.set("testuserid");
  meteorUserReturnedValue.set(EJSON.clone(user));
  Tracker.flush();
  test.isFalse(signedUpResult, "loginStateSignedUp undefined");
  test.equal(runCount, expectedRunCount);

  user.loginStateSignedUp = true;
  meteorUserReturnedValue.set(EJSON.clone(user));
  Tracker.flush();
  expectedRunCount++;
  test.isTrue(signedUpResult, "loginStateSignedUp === true");
  test.equal(runCount, expectedRunCount);

  user.loginStateSignedUp = false;
  meteorUserReturnedValue.set(EJSON.clone(user));
  Tracker.flush();
  expectedRunCount++;
  test.isFalse(signedUpResult, "loginStateSignedUp === false");
  test.equal(runCount, expectedRunCount);

  Meteor.userId = meteorUserId;
  Meteor.user = meteorUser;
  stopper.stop();
});


Tinytest.addAsync('LoginState - signedUp accept test', function (test, done) {
  var runCount, expectedRunCount;
  var signedUpResult;
  var TestLoginState = new LoginState.constructor();
  runCount = expectedRunCount = 0;
  var stopper;

  Meteor.logout(function (error) {
    test.isUndefined(error, 'logout failed');
    Tracker.flush();
    stopper = Tracker.autorun(function () {
      runCount++;
      signedUpResult = TestLoginState.signedUp();
    });
    expectedRunCount++;
    test.isFalse(signedUpResult, "logged out");
    test.equal(runCount, expectedRunCount);
    loginWithTest1();
  });

  function loginWithTest1() {
    AccountsTestingSupport.login("test1", "testname", {}, function (error) {
      test.isUndefined(error, 'login failed');
      Tracker.flush();
      test.isFalse(signedUpResult, "using unconfigured service");
      test.equal(runCount, expectedRunCount);
      configureTest1();
    });
  }

  function configureTest1() {
    Meteor.call('addService', 'test1', function (error) {
      test.isUndefined(error, 'addService failed');
      Tracker.flush();
      expectedRunCount++;
      test.isTrue(signedUpResult, "using configured service");
      test.equal(runCount, expectedRunCount);
      loginWithConfiguredTest1();
    });
  }

  function loginWithConfiguredTest1() {
    AccountsTestingSupport.login("test1", "testname2", {}, function (error) {
      test.isUndefined(error, 'login with configured service failed');
      Tracker.flush();
      test.isTrue(signedUpResult, "using configured service, new user");
      test.equal(runCount, expectedRunCount);
      unconfigureTest1();
    });
  }

  function unconfigureTest1() {
    Meteor.call('removeService', 'test1', function (error) {
      test.isUndefined(error, 'removeService failed');
      Tracker.flush();
      expectedRunCount++;
      test.isFalse(signedUpResult, "using newly unconfigured service");
      test.equal(runCount, expectedRunCount);
      removePasswordUser();
    });
  }

  function removePasswordUser() {
    Meteor.call('removeUser', 'guest', function (error) {
      test.isUndefined(error, 'removeUser failed');
      removeInterceptorForGuest();
    });
  }

  function removeInterceptorForGuest() {
    Meteor.call('removeInterceptorForGuest', function (error) {
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
      expectedRunCount++;
      test.isTrue(signedUpResult,
        "using guest password user without interceptor");
      test.equal(runCount, expectedRunCount);
      addInterceptorForGuest();
    });
  }

  function addInterceptorForGuest() {
    Meteor.call('addInterceptorForGuest', function (error) {
      test.isUndefined(error, 'addInterceptorForGuest failed');
      Tracker.flush();
      expectedRunCount++;
      test.isFalse(signedUpResult,
        "using guest password user with interceptor");
      test.equal(runCount, expectedRunCount);
      logoutOfGuest();
    });
  }

  function logoutOfGuest() {
    Meteor.logout(function (error) {
      test.isUndefined(error, 'logout of guest failed');
      Tracker.flush();
      test.isFalse(signedUpResult, "logged out after logout of guest");
      test.equal(runCount, expectedRunCount);
      loginAsGuest();
    });
  }

  function loginAsGuest() {
    Meteor.loginWithPassword("guest", "password", function (error) {
      test.isUndefined(error, 'login of guest failed');
      Tracker.flush();
      test.isFalse(signedUpResult, "after logging in as guest");
      test.equal(runCount, expectedRunCount);
      cleanUp();
    });
  }

  function cleanUp() {
    Meteor.call('removeInterceptorForGuest', function (error) {
      test.isUndefined(error, 'removeInterceptorForGuest failed in cleanUp');
      stopper.stop();
      done();
    });
  }
});
