# brettle:accounts-login-state

[![Build Status](https://travis-ci.org/brettle/meteor-accounts-login-state.svg?branch=master)](https://travis-ci.org/brettle/meteor-accounts-login-state)

Track the current user's login state and register callbacks that help calculate
it.

This package is part of the `brettle:accounts-*` suite of packages. See
[`brettle:accounts-deluxe`](https://atmospherejs.com/brettle/accounts-deluxe)
for an overview of the suite and a live demo.

## Installation
```sh
meteor add brettle:accounts-anonymous-auto
```

## Usage

This package provides the following reactive data sources for tracking the
current user's login state:

  `LoginState.loggingIn()` - alias for `Meteor.loggingIn()` which is already
  reactive.

  `LoginState.loggedIn()` - same as `!! Meteor.userId()` but reactive so that
  switching between users won't rerun computations that depend on it.

  `LoginState.signedUp()` - whether the user has signed up via some sort of
  authenticated account, as opposed to an anonymous or guest user. Accounts user
  interface packages should use the result of calling this function when
  determining whether to give the user the ability to sign-in/sign-up. The value
  returned by this function is `false` if `LoginState.loggedIn()` returns
  `false`. Otherwise, it the same as the result of allowing all callbacks
  registered with `LoginState.addSignedUpInterceptor()` to change a common
  object that starts as `{ signedUp: false }`, and then returning the final
  value of that object's `signedUp` property.

Packages and applications that provide anonymous users, guest users, or other
users that haven't signed up should call
`LoginState.addSignedUpInterceptor(callback)` to provide a callback that helps
determine whether the current has signed up. The callback receives a single
argument, which is an object with a `signedUp` property. If the callback can't
determine whether the current user has signed up, it should not change that
property. Otherwise, it should set it to `true` if the user has signed up, and
`false` if the user hasn't.

By default, there are 2 interceptors. The first considers the user signed up if
you have installed `accounts-password` and the user has a password and either a
username or an email. The second considers the user signed up if they have
logged in with any 3rd party service configured with `service-configuration`.
