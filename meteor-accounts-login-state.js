"use strict";
/* globals LoginState: true, Hook*/

function LoginStateConstructor() {
  var self = this;
  self._loggedIn = new ReactiveVar();
  Tracker.autorun(function () {
    self._loggedIn.set(!!Meteor.userId());
  });
  self._signedUp = new ReactiveVar();
  self._signedUpHook = new Hook({
    debugPrintExceptions: "LoginState signedUp interceptor callback"
  });
  self._signedUpHookDep = new Tracker.Dependency();
  Tracker.autorun(function () {
    // If the user is not logged in then they can't be signed in. Period.
    if (!self.loggedIn()) {
      self._signedUp.set(false);
      return;
    }

    // Rerun this autorun if hooks change
    self._signedUpHookDep.depend();
    var info = {
      signedUp: false
    };
    self._signedUpHook.each(function (cb) {
      cb(info);
      return true;
    });
    self._signedUp.set(info.signedUp);
  });

  // If accounts-password is installed and the user has a username, or at
  // least one email address, then they are signed in.
  if (Package['accounts-password']) {
    self.addSignedUpInterceptor(function (info) {
      var u = Meteor.user();
      if (u &&
        (typeof (u.username) === 'string' ||
          (u.emails && u.emails[0] &&
            typeof (u.emails[0].address) === 'string'))) {
        info.signedUp = true;
      }
    });
  }
  self.addSignedUpInterceptor(function (info) {
    // To handle oauth services, if the user has a profile.name, then they are
    // signed in
    var u = Meteor.user();
    if (u && u.profile && typeof (u.profile.name) === 'string') {
      info.signedUp = true;
    }
  });
}

LoginStateConstructor.prototype.loggingIn = function () {
  return Meteor.loggingIn.call(Meteor);
};

LoginStateConstructor.prototype.loggedIn = function () {
  return this._loggedIn.get();
};

LoginStateConstructor.prototype.signedUp = function () {
  return this._signedUp.get();
};

LoginStateConstructor.prototype.addSignedUpInterceptor = function (cb) {
  var self = this;
  var stopper = self._signedUpHook.register(cb);
  self._signedUpHookDep.changed();

  var origStop = stopper.stop;
  stopper.stop = function ( /* arguments */ ) {
    origStop.apply(this, arguments);
    self._signedUpHookDep.changed();
  };
  return stopper;
};

LoginState = new LoginStateConstructor();
