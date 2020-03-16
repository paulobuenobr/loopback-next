// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/example-passport-login
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  AuthenticateFn,
  AuthenticationBindings,
  AUTHENTICATION_STRATEGY_NOT_FOUND,
  USER_PROFILE_NOT_FOUND,
} from '@loopback/authentication';
import {inject} from '@loopback/context';
import {
  FindRoute,
  InvokeMethod,
  ParseParams,
  Reject,
  RequestContext,
  RestBindings,
  Send,
  SequenceHandler,
} from '@loopback/rest';
import {StrategyOption} from 'passport-facebook';
import {StrategyOptions} from 'passport-google-oauth2';
import {StrategyOptions as CustomOAuth2Options} from 'passport-oauth2';
const oauth2Providers = require('../../oauth2-providers');

/**
 * needs improvement
 * TODO:
 *    1. read provider specific options from a datastore
 *    2. store oauth2 provider registrations, ie, app registrations in the datastore,
 *       so that client_id and client_secrets can be stored securely
 */
const facebookOptions: StrategyOption = {
  clientID:
    process.env.FACEBOOK_APPID ?? oauth2Providers['facebook-login'].clientID,
  clientSecret: oauth2Providers['facebook-login'].clientSecret,
  callbackURL: oauth2Providers['facebook-login'].callbackURL,
  profileFields: oauth2Providers['facebook-login'].profileFields,
};

const googleOptions: StrategyOptions = {
  clientID:
    process.env.GOOGLE_APPID ?? oauth2Providers['google-login'].clientID,
  clientSecret: oauth2Providers['google-login'].clientSecret,
  callbackURL: oauth2Providers['google-login'].callbackURL,
  scope: oauth2Providers['google-login'].scope,
};

const oauth2Options: CustomOAuth2Options = {
  clientID: oauth2Providers['oauth2'].clientID,
  clientSecret: oauth2Providers['oauth2'].clientSecret,
  callbackURL: oauth2Providers['oauth2'].callbackURL,
  authorizationURL: oauth2Providers['oauth2'].authorizationURL,
  tokenURL: oauth2Providers['oauth2'].tokenURL,
};

const SequenceActions = RestBindings.SequenceActions;

export class MySequence implements SequenceHandler {
  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS)
    protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) protected send: Send,
    @inject(SequenceActions.REJECT) protected reject: Reject,
    @inject(AuthenticationBindings.AUTH_ACTION)
    protected authenticateRequest: AuthenticateFn,
  ) {}

  async handle(context: RequestContext) {
    try {
      const {request, response} = context;
      const route = this.findRoute(request);

      // usually authentication is done before proceeding to parse params
      // but in our case we need the path params to know the provider name
      const args = await this.parseParams(request, route);

      /**
       * bind the oauth2 options to request context
       *
       * TODO:
       *    bind secrets like client_id and client_secret from here,
       *    read secrets specific to this request from a datastore
       */
      context.bind('facebookOAuth2Options').to(facebookOptions);
      context.bind('googleOAuth2Options').to(googleOptions);
      context.bind('customOAuth2Options').to(oauth2Options);

      // if provider name is available in the request path params, set it in the query
      if (route.pathParams && route.pathParams.provider) {
        request.query['oauth2-provider-name'] = route.pathParams.provider;
      }

      //call authentication action
      await this.authenticateRequest(request);

      // Authentication successful, proceed to invoke controller
      const result = await this.invoke(route, args);
      this.send(response, result);
    } catch (error) {
      if (
        error.code === AUTHENTICATION_STRATEGY_NOT_FOUND ||
        error.code === USER_PROFILE_NOT_FOUND
      ) {
        Object.assign(error, {statusCode: 401 /* Unauthorized */});
      }
      this.reject(context, error);
      return;
    }
  }
}
