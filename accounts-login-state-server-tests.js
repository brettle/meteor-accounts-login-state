"use strict";
/* globals ServiceConfiguration */
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
  }
});
