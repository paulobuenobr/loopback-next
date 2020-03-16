// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/example-access-control-migration
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {inject} from '@loopback/context';
import {
  post,
  requestBody,
  Response,
  RestBindings,
  RequestWithSession,
} from '@loopback/rest';
import {UserRepository} from '../repositories';
import {repository} from '@loopback/repository';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {authenticate} from '@loopback/authentication';

export type Credentials = {
  email: string;
  password: string;
  name: string;
};

const CredentialsSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
    },
    password: {
      type: 'string',
      minLength: 8,
    },
  },
};

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
  ) {}

  @post('/users/signup')
  async signup(
    @requestBody({
      description: 'signup user locally',
      required: true,
      content: {
        'application/x-www-form-urlencoded': {schema: CredentialsSchema},
      },
    })
    credentials: Credentials,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    await this.userRepository.create({
      email: credentials.email,
      username: credentials.email,
      name: credentials.name,
    });
    response.redirect('/login');
    return response;
  }

  @authenticate('local')
  @post('/login')
  async login(
    @requestBody({
      description: 'login to create a user session',
      required: true,
      content: {
        'application/x-www-form-urlencoded': {schema: CredentialsSchema},
      },
    })
    credentials: Credentials,
    @inject(SecurityBindings.USER) user: UserProfile,
    @inject(RestBindings.Http.REQUEST) request: RequestWithSession,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    const profile = {
      ...user.profile,
    };
    request.session.user = profile;
    response.redirect('/auth/account');
    return response;
  }
}
