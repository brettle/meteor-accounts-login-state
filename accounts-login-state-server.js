/* globals ServiceConfiguration */
"use strict";

// Add a client-only `LoginState` property to the current user record
// and set `LoginState.signedUpWithConfiguredService` to a boolean
// indicatng whether the current user has logged in using a service configured
// with `service-configuration`.
Meteor.publish(null, function () {
  var self = this;
  if (!self.userId) {
    return null;
  }
  var userObserverStopper = Meteor.users.find({
    _id: self.userId
  }).observeChanges({
    added: updateLoginStateSignedUp,
    changed: updateLoginStateSignedUp // TODO: only update when services change
  });

  var configsObserverStopper =
    ServiceConfiguration.configurations.find().observe({
      added: updateLoginStateSignedUp,
      removed: updateLoginStateSignedUp
    });

  self.onStop(function () {
    userObserverStopper.stop();
    configsObserverStopper.stop();
  });

  self.ready();

  function updateLoginStateSignedUp() {
    var user = Meteor.users.findOne({
      _id: self.userId
    });
    var usedServices = _.keys(user.services);
    var configuredServices =
      ServiceConfiguration.configurations.find().map(function (config) {
        return config.service;
      });
    var signedUp =
      (_.intersection(configuredServices, usedServices).length > 0);
    self.changed('users', self.userId, {
      LoginState: {
        signedUpWithConfiguredService: signedUp
      }
    });
  }
});
