"use strict";

Package.describe({
  name: 'brettle:accounts-login-state',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: "Track the current user's login state and register callbacks that " +
    "help calculate it.",
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/brettle/meteor-accounts-login-state.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.4');
  api.use('underscore');
  api.use('accounts-base');
  api.use('tracker');
  api.use('reactive-var');
  api.use('callback-hook');
  api.use('accounts-password', 'client', { weak: true });
  api.addFiles('meteor-accounts-login-state.js', 'client');
  api.export('LoginState');
});

Package.onTest(function(api) {
  api.versionsFrom('1.0.4');
  api.use('tinytest');
  api.use('brettle:accounts-login-state@0.0.1');
  api.use('underscore');
  api.use('tracker');
  api.use('reactive-var');
  api.use('accounts-base');
  api.use('accounts-password');
  api.addFiles('meteor-accounts-login-state-tests.js', 'client');
});
