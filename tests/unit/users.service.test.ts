import { AppError } from '../../src/core/exceptions/app-error';
import { ERROR_CODES } from '../../src/shared/constants/error-codes';
import type { User } from '../../src/modules/users/entities/user.entity';
import type { UserRepository } from '../../src/modules/users/repositories/user.repository';
import { UsersService } from '../../src/modules/users/services/users.service';

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 5,
    username: 'somchai',
    email: 'somchai@example.com',
    passwordHash: 'secret-hash',
    status: 'active',
    roleId: 3,
    role: { id: 3, name: 'staff' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

function setup() {
  const repo = {
    findById: jest.fn().mockResolvedValue(fakeUser()),
    isIdentityTaken: jest.fn().mockResolvedValue(false),
    create: jest.fn().mockResolvedValue(5),
    update: jest.fn().mockResolvedValue(undefined),
    softDelete: jest.fn().mockResolvedValue(undefined),
  };
  const roles = { exists: jest.fn().mockResolvedValue(true), findIdByName: jest.fn() };
  return { service: new UsersService(repo as unknown as UserRepository, roles), repo, roles };
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  return promise.then(
    () => undefined,
    (error: AppError) => error.code,
  );
}

const newUser = {
  username: 'somchai',
  email: 'somchai@example.com',
  password: 'a-long-passphrase',
  roleId: 3,
  status: 'active' as const,
};

describe('UsersService', () => {
  it('hashes the password on create and never returns it', async () => {
    const { service, repo } = setup();
    const result = await service.create(newUser);
    const [saved] = repo.create.mock.lastCall as [{ passwordHash: string }];
    expect(saved.passwordHash).not.toBe(newUser.password);
    expect(JSON.stringify(result)).not.toMatch(/hash|password/i);
  });

  it('rejects a duplicate identity', async () => {
    const { service, repo } = setup();
    repo.isIdentityTaken.mockResolvedValue(true);
    expect(await codeOf(service.create(newUser))).toBe(ERROR_CODES.USER_ALREADY_EXISTS);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects a role that does not exist', async () => {
    const { service, roles } = setup();
    roles.exists.mockResolvedValue(false);
    expect(await codeOf(service.create(newUser))).toBe(ERROR_CODES.ROLE_NOT_FOUND);
  });

  it('returns USER_NOT_FOUND for a missing user', async () => {
    const { service, repo } = setup();
    repo.findById.mockResolvedValue(null);
    expect(await codeOf(service.getById(99))).toBe(ERROR_CODES.USER_NOT_FOUND);
  });

  it.each([{ roleId: 1 }, { status: 'suspended' as const }])(
    'stops users changing their own access: %j',
    async (dto) => {
      const { service, repo } = setup();
      expect(await codeOf(service.update(5, dto, 5))).toBe(
        ERROR_CODES.USER_SELF_MODIFICATION_FORBIDDEN,
      );
      expect(repo.update).not.toHaveBeenCalled();
    },
  );

  it('allows a PUT on yourself that keeps the same role and status', async () => {
    const { service, repo } = setup();
    await service.update(5, { username: 'renamed', roleId: 3, status: 'active' }, 5);
    expect(repo.update).toHaveBeenCalled();
  });

  it('stops users deleting themselves', async () => {
    const { service, repo } = setup();
    expect(await codeOf(service.remove(5, 5))).toBe(ERROR_CODES.USER_SELF_MODIFICATION_FORBIDDEN);
    expect(repo.softDelete).not.toHaveBeenCalled();
  });
});
