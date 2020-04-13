// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/example-passport-login
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {AuthenticationStrategy, asAuthStrategy} from '@loopback/authentication';
import {RedirectRoute, RequestWithSession, HttpErrors} from '@loopback/rest';
import {UserProfile, securityId} from '@loopback/security';
import {User} from '../models';
import {bind} from '@loopback/context';
import {repository} from '@loopback/repository';
import {UserRepository} from '../repositories';

@bind(asAuthStrategy)
export class SessionStrategy implements AuthenticationStrategy {
  name = 'session';

  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
  ) {}

  /**
   * authenticate a request
   * @param request
   */
  async authenticate(request: RequestWithSession): Promise<UserProfile | RedirectRoute | undefined> {
    if (!request.user) {
      throw new HttpErrors.Unauthorized(
        `Invalid Session`,
      );
    }
    let user: User = request.user as User;
    if (!user.email || !user.id) {
      throw new HttpErrors.Unauthorized(
        `Invalid user profile`,
      );
    }
    const users: User[] = await this.userRepository.find({
      where: {
        email: user.email,
      },
    });
    if (!users || !users.length) {
      throw new HttpErrors.Unauthorized(
        `User not registered`,
      );
    }
    return this.mapProfile(request.user as User);
  }

  /**
   * map passport profile to user profile
   * @param user
   */
  mapProfile(user: User): UserProfile {
    const userProfile: UserProfile = {
      [securityId]: '' + user.id,
      profile: {
        ...user,
      },
    };
    return userProfile;
  }
}
