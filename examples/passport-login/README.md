# @loopback/example-passport-login

A tutorial for implementing authentication in LoopBack 4 using [passport](https://github.com/jaredhanson/passport) modules.

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Install](#install-the-example-locally)
- [Tutorial - Facebook](#Try-it-out-with-FaceBook)

## Overview

This example demonstrates how to use the LoopBack 4 features (like `@authenticate` decorator, strategy providers, etc) with [passport strategies](http://passportjs.org). It includes the local strategy as well as oauth2 strategies to interact with other auth providers like facebook, google,etc.

- Log in or sign up to LoopBack using third party providers (aka social logins)
- Link third party accounts with a LoopBack user (for example, a LoopBack user can have associated facebook/google accounts to retrieve pictures).

## Prerequisites

Before starting this tutorial, make sure you have Client-ids/Secrets from third party apps

- [facebook](https://developers.facebook.com/apps)
- [google](https://console.developers.google.com/project)
- [twitter](https://apps.twitter.com/) **Not yet implemented**

## Install the example locally

1. Run the `lb4 example` command to install `example-passport-login`
   repository:

   ```sh
   lb4 example passport-login
   ```

2. change into directory and then install the required dependencies:

   ```sh
   cd loopback4-example-passport-login && npm i
   ```

## Try it out with FaceBook

### Create a test app and test user in FaceBook

1. Login to facebook developer console: https://developers.facebook.com/apps
2. Click on `My Apps` tab in the dashboard menu, and then `Add a new App`
3. Pick the platform as `Website` and then enter app category, app name and "Site URL" (Skip the quick start)
4. Click `Settings` tab from navigation menu, note the "App ID" and "App Secret" and save
5. Click the `Roles` tab from navigation menu, then the `Test users` link under it, to display a list of test users.
   You can also create a new test user.
6. Click on the edit->`Change permissions granted by this test user` and add [email, manage_pages] permissions

- NOTE:
   - Your app may not work if the settings are missing a contact email and/or "Site URL".
   - if you are testing locally, you can simply use `localhost:[port#]` as your "Site URL".

### 3. Create oauth2-providers.json

- Copy `oauth2-providers.template.json` from this example project's root to `oauth2-providers.json`
- Update facebook oauth2 config with the values for `clientID/clientSecret` from your test app.

  ```
  "facebook-login": {
    "provider": "facebook",
    "module": "passport-facebook",
    "clientID": "xxxxxxxxxxxxxxx",
    "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "callbackURL": "/auth/facebook/callback",
    "authPath": "/auth/facebook",
    "callbackPath": "/auth/facebook/callback",
    "successRedirect": "/auth/account",
    "failureRedirect": "/login",
    "scope": ["email"],
    "failureFlash": true,
    "profileFields": ["gender", "link", "locale", "name", "timezone", "verified", "email", "updated_time"]
  }
  ```

The `profileFields` field above tells facebook details to return in profile data after authentication.
For more information regarding the providers template, see http://loopback.io/doc/en/lb2/Configuring-providers.json.html.

### 6. Run the application

By default the user data is stored using a memory connector and saved locally to `data/db.json`

Start the application with

```
$ npm start
```

- Open your browser to the example app with, `http://localhost:3000`
- Click on 'Sign up options' from the example app header menu
- Click on 'Sign up with Facebook' button
- FaceBook login page opens, enter test user-id and password
- example app loads again on successful login
- redirect to example app will fail if facebook did not return profile with email-id
