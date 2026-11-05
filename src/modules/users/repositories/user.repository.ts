import type { EntityManager, Repository } from 'typeorm';
import type { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { User } from '../entities/user.entity';
import type { LoginFailurePolicy } from '../interfaces/user.interface';

// Whitelist mapping client sort values to columns; never interpolate client input.
const SORT_COLUMNS: Record<ListUsersQueryDto['sortBy'], string> = {
  id: 'user.id',
  username: 'user.username',
  email: 'user.email',
  status: 'user.status',
  created_at: 'user.createdAt',
};

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

export type NewUser = Pick<User, 'username' | 'email' | 'passwordHash' | 'roleId' | 'status'>;
export type UserChanges = Partial<Pick<User, 'username' | 'email' | 'roleId' | 'status'>>;

export class UserRepository {
  constructor(private readonly repo: Repository<User>) {}

  withManager(manager: EntityManager): UserRepository {
    return new UserRepository(manager.getRepository(User));
  }

  findById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id }, relations: { role: true } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email }, relations: { role: true } });
  }

  /** Includes soft-deleted rows because their unique values remain reserved. */
  async isIdentityTaken(
    identity: { username?: string; email?: string },
    excludeId?: number,
  ): Promise<boolean> {
    const query = this.repo.createQueryBuilder('user').withDeleted();
    query.where('(user.username = :username OR user.email = :email)', {
      username: identity.username ?? null,
      email: identity.email ?? null,
    });
    if (excludeId !== undefined) {
      query.andWhere('user.id <> :excludeId', { excludeId });
    }
    return (await query.getCount()) > 0;
  }

  findPage(query: ListUsersQueryDto): Promise<[User[], number]> {
    const builder = this.repo.createQueryBuilder('user').innerJoinAndSelect('user.role', 'role');
    if (query.search) {
      builder.andWhere('(user.username LIKE :search OR user.email LIKE :search)', {
        search: `%${escapeLike(query.search)}%`,
      });
    }
    if (query.status) {
      builder.andWhere('user.status = :status', { status: query.status });
    }
    if (query.roleId) {
      builder.andWhere('user.roleId = :roleId', { roleId: query.roleId });
    }
    return builder
      .orderBy(SORT_COLUMNS[query.sortBy], query.sortOrder)
      .addOrderBy('user.id', query.sortOrder)
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  async create(data: NewUser): Promise<number> {
    const saved = await this.repo.save(this.repo.create(data));
    return saved.id;
  }

  async update(id: number, changes: UserChanges): Promise<void> {
    await this.repo.update({ id }, changes);
  }

  async softDelete(id: number): Promise<void> {
    await this.repo.softDelete({ id });
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    await this.repo.update({ id }, { passwordHash });
  }

  /** The increment is atomic, so parallel guesses cannot slip past the attempt limit. */
  async recordFailedLogin(id: number, policy: LoginFailurePolicy): Promise<void> {
    await this.repo.increment({ id }, 'failedLoginAttempts', 1);
    await this.repo
      .createQueryBuilder()
      .update(User)
      .set({ lockedUntil: policy.lockedUntil, failedLoginAttempts: 0 })
      .where('id = :id AND failed_login_attempts >= :maxAttempts', {
        id,
        maxAttempts: policy.maxAttempts,
      })
      .execute();
  }

  async clearLoginFailures(id: number): Promise<void> {
    await this.repo.update({ id }, { failedLoginAttempts: 0, lockedUntil: null });
  }
}
