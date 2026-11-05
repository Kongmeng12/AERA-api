import type { EntityManager } from 'typeorm';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../core/exceptions/app-error';
import { ERROR_CODES } from '../../../shared/constants/error-codes';
import { toPaginatedResult } from '../../../shared/helpers/pagination';
import { hashPassword } from '../../../shared/helpers/password';
import type { PaginatedResult } from '../../../shared/response/api-response';
import type { RoleLookup } from '../../roles/interfaces/role-lookup.interface';
import type { CreateUserDto } from '../dto/create-user.dto';
import type { ListUsersQueryDto } from '../dto/list-users-query.dto';
import type { UpdateUserDto } from '../dto/update-user.dto';
import { toUserResponse, type UserResponseDto } from '../dto/user-response.dto';
import type { User } from '../entities/user.entity';
import type {
  LoginFailurePolicy,
  UserAuthRecord,
  UserCredentialStore,
} from '../interfaces/user.interface';
import type { UserRepository } from '../repositories/user.repository';

function toAuthRecord(user: User | null): UserAuthRecord | null {
  return (
    user && {
      id: user.id,
      passwordHash: user.passwordHash,
      status: user.status,
      role: user.role.name,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
    }
  );
}

export class UsersService implements UserCredentialStore {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleLookup,
  ) {}

  async list(query: ListUsersQueryDto): Promise<PaginatedResult<UserResponseDto>> {
    const [users, total] = await this.users.findPage(query);
    return toPaginatedResult(users.map(toUserResponse), total, query.page, query.limit);
  }

  async getById(id: number): Promise<UserResponseDto> {
    return toUserResponse(await this.requireUser(id));
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.assertRoleExists(dto.roleId);
    await this.assertIdentityAvailable(dto);
    const id = await this.users.create({
      username: dto.username,
      email: dto.email,
      passwordHash: await hashPassword(dto.password),
      roleId: dto.roleId,
      status: dto.status,
    });
    return this.getById(id);
  }

  async update(id: number, dto: UpdateUserDto, actorId: number): Promise<UserResponseDto> {
    const user = await this.requireUser(id);
    const changesRole = dto.roleId !== undefined && dto.roleId !== user.roleId;
    const changesStatus = dto.status !== undefined && dto.status !== user.status;
    if (id === actorId && (changesRole || changesStatus)) {
      throw new ForbiddenError(
        ERROR_CODES.USER_SELF_MODIFICATION_FORBIDDEN,
        'You cannot change your own role or status',
      );
    }
    if (changesRole) {
      await this.assertRoleExists(dto.roleId as number);
    }
    await this.assertIdentityAvailable(dto, id);
    await this.users.update(id, {
      username: dto.username,
      email: dto.email,
      roleId: dto.roleId,
      status: dto.status,
    });
    return this.getById(id);
  }

  async remove(id: number, actorId: number): Promise<void> {
    if (id === actorId) {
      // Also guarantees the system can never lose its last admin through this API.
      throw new ForbiddenError(
        ERROR_CODES.USER_SELF_MODIFICATION_FORBIDDEN,
        'You cannot delete your own account',
      );
    }
    await this.requireUser(id);
    await this.users.softDelete(id);
  }

  async findAuthRecordByEmail(email: string): Promise<UserAuthRecord | null> {
    return toAuthRecord(await this.users.findByEmail(email));
  }

  async findAuthRecordById(id: number): Promise<UserAuthRecord | null> {
    return toAuthRecord(await this.users.findById(id));
  }

  recordFailedLogin(id: number, policy: LoginFailurePolicy): Promise<void> {
    return this.users.recordFailedLogin(id, policy);
  }

  clearLoginFailures(id: number): Promise<void> {
    return this.users.clearLoginFailures(id);
  }

  updatePasswordHash(id: number, passwordHash: string, manager?: EntityManager): Promise<void> {
    const users = manager ? this.users.withManager(manager) : this.users;
    return users.updatePasswordHash(id, passwordHash);
  }

  private async requireUser(id: number): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundError(ERROR_CODES.USER_NOT_FOUND, 'User not found');
    }
    return user;
  }

  private async assertRoleExists(roleId: number): Promise<void> {
    if (!(await this.roles.exists(roleId))) {
      throw new ValidationError(ERROR_CODES.ROLE_NOT_FOUND, 'Validation failed', [
        { field: 'roleId', message: 'Role does not exist' },
      ]);
    }
  }

  private async assertIdentityAvailable(
    identity: { username?: string; email?: string },
    excludeId?: number,
  ): Promise<void> {
    if (!identity.username && !identity.email) {
      return;
    }
    if (await this.users.isIdentityTaken(identity, excludeId)) {
      throw new ConflictError(
        ERROR_CODES.USER_ALREADY_EXISTS,
        'A user with this username or email already exists',
      );
    }
  }
}
