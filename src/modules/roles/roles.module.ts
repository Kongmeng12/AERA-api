import type { Router } from 'express';
import type { DataSource } from 'typeorm';
import { RolesController } from './controllers/roles.controller';
import { Role } from './entities/role.entity';
import type { RoleLookup } from './interfaces/role-lookup.interface';
import { RoleRepository } from './repositories/role.repository';
import { createRolesRouter } from './routes/roles.routes';
import { RolesService } from './services/roles.service';

export interface RolesModule {
  router: Router;
  roleLookup: RoleLookup;
}

export function createRolesModule(dataSource: DataSource): RolesModule {
  const service = new RolesService(new RoleRepository(dataSource.getRepository(Role)));
  return { router: createRolesRouter(new RolesController(service)), roleLookup: service };
}
