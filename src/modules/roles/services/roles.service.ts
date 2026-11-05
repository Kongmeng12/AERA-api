import type { RoleName } from '../../../shared/constants/roles';
import { toRoleResponse, type RoleResponseDto } from '../dto/role-response.dto';
import type { RoleLookup } from '../interfaces/role-lookup.interface';
import type { RoleRepository } from '../repositories/role.repository';

export class RolesService implements RoleLookup {
  constructor(private readonly roles: RoleRepository) {}

  async list(): Promise<RoleResponseDto[]> {
    return (await this.roles.findAll()).map(toRoleResponse);
  }

  exists(roleId: number): Promise<boolean> {
    return this.roles.existsById(roleId);
  }

  async findIdByName(name: RoleName): Promise<number | null> {
    return (await this.roles.findByName(name))?.id ?? null;
  }
}
