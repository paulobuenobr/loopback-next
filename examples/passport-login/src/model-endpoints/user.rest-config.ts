import {ModelCrudRestApiConfig} from '@loopback/rest-crud';
import {User} from '../models/user.model';

module.exports = <ModelCrudRestApiConfig>{
  model: User,
  pattern: 'CrudRest',
  dataSource: 'db',
  basePath: '/users',
};
