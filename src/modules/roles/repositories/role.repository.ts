import type { Repository } from 'typeorm';
import type { RoleName } from '../../../shared/constants/roles';
import type { Role } from '../entities/role.entity';

export class RoleRepository {
  constructor(private readonly repo: Repository<Role>) {}

  findAll(): Promise<Role[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  existsById(id: number): Promise<boolean> {
    return this.repo.existsBy({ id });
  }

  findByName(name: RoleName): Promise<Role | null> {
    return this.repo.findOneBy({ name });
  }
}
