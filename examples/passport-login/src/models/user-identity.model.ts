// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/example-passport-login
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Entity, model, property} from '@loopback/repository';

@model()
export class UserIdentity extends Entity {
  @property({
    type: 'string',
    id: 1,
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  provider: string;

  @property({
    type: 'object',
    required: true,
  })
  profile: object;

  @property({
    type: 'object',
  })
  credentials?: object;

  @property({
    type: 'string',
    required: true,
  })
  authScheme: string;

  @property({
    type: 'date',
    required: true,
  })
  created?: Date;

  @property({
    type: 'number',
    required: true,
  })
  userId: number;

  constructor(data?: Partial<UserIdentity>) {
    super(data);
  }
}
