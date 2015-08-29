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

This package provides the following functions for tracking the
current user's login state:

  `LoginState.loggedIn()` - same as `!! Meteor.userId()` but reactive on the
  client so that switching between users won't rerun computations that depend on
  it.

  `LoginState.signedUp()` - whether the current user has signed up via some sort
  of authenticated account, as opposed to an anonymous or guest user. This is
  reactive on the client. Accounts user interface packages should use the result
  of calling this function when determining whether to give the user the ability
  to sign-in/sign-up. The value returned by this function is `false` if
  `LoginState.loggedIn()` returns `false`. Otherwise, it's the value of
  `Meteor.user().loginStateSignedUp`. The server publishes the value of the
  `loginStateSignedUp` field and allows all callbacks registered with
  `LoginState.addSignedUpInterceptor()` to change it whenever the user record or
  set of configured services changes. On the server, `LoginState.signedUp()`
  itself takes an optional `user` argument (defaults to `Meteor.user()`) which
  you can use to determine whether a particular user has signed up.


Packages and applications that provide anonymous users, guest users, or other
users that haven't signed up should call
`LoginState.addSignedUpInterceptor(callback)` on the server to provide a
callback that helps determine whether a user has signed up. The callback
receives a single argument, which is the user record under consideration. The
callback should set the user's `loginStateSignedUp` property to `true` if the
callback can determine that the user has signed up, and `false` callback can
determine that the user hasn't signed up. If the callback can't determine
whether the current user has signed up, it should not change the property. It
must not change any part of the user record other than the `loginStateSignedUp`
property, and future versions of this package might remove such changes.

By default, there are 2 interceptors. The first considers the user signed up if
you have installed `accounts-password` and the user has a password and either a
username or an email. The second considers the user signed up if they have
logged in with any 3rd party service configured with `service-configuration`.

If you create guest users by using `accounts-password` to create users with
random passwords and `profile.guest = true` you might add an interceptor like
this:

```javascript
LoginState.addSignedUpInterceptor(function (u) {
  if (u.services && u.services.password && u.profile && u.profile.guest) {
    u.loginStateSignedUp = false;
  }
});
```
