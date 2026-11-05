import type { Router } from 'express';
import type { DataSource } from 'typeorm';
import type { RoleLookup } from '../roles/interfaces/role-lookup.interface';
import { UsersController } from './controllers/users.controller';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { createUsersRouter } from './routes/users.routes';
import { UsersService } from './services/users.service';

export interface UsersModule {
  router: Router;
  service: UsersService;
}

export function createUsersModule(dataSource: DataSource, roles: RoleLookup): UsersModule {
  const service = new UsersService(new UserRepository(dataSource.getRepository(User)), roles);
  return { router: createUsersRouter(new UsersController(service)), service };
}
