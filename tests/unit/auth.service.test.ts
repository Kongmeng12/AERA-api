import bcrypt from 'bcrypt';
import type { EntityManager } from 'typeorm';
import { AppError } from '../../src/core/exceptions/app-error';
import { ERROR_CODES } from '../../src/shared/constants/error-codes';
import type { RefreshToken } from '../../src/modules/auth/entities/refresh-token.entity';
import type { RefreshTokenRepository } from '../../src/modules/auth/repositories/refresh-token.repository';
import {
  AuthService,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from '../../src/modules/auth/services/auth.service';
import { TokenService } from '../../src/modules/auth/services/token.service';
import type {
  UserAuthRecord,
  UserCredentialStore,
} from '../../src/modules/users/interfaces/user.interface';

const client = { userAgent: 'jest', ipAddress: '127.0.0.1' };
const PASSWORD = 'correct-password';
const passwordHash = bcrypt.hashSync(PASSWORD, 4);

function authRecord(overrides: Partial<UserAuthRecord> = {}): UserAuthRecord {
  return {
    id: 7,
    passwordHash,
    status: 'active',
    role: 'staff',
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

function setup(user: UserAuthRecord | null = authRecord()) {
  const users: jest.Mocked<UserCredentialStore> = {
    findAuthRecordByEmail: jest.fn().mockResolvedValue(user),
    findAuthRecordById: jest.fn().mockResolvedValue(user),
    recordFailedLogin: jest.fn().mockResolvedValue(undefined),
    clearLoginFailures: jest.fn().mockResolvedValue(undefined),
    updatePasswordHash: jest.fn().mockResolvedValue(undefined),
  };
  const repo = {
    findByHash: jest.fn(),
    insert: jest.fn().mockResolvedValue(undefined),
    revokeIfActive: jest.fn().mockResolvedValue(true),
    revokeFamily: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    deleteExpiredForUser: jest.fn().mockResolvedValue(undefined),
    withManager: jest.fn(),
  };
  repo.withManager.mockReturnValue(repo);
  const tokens = new TokenService();
  const service = new AuthService(
    users,
    repo as unknown as RefreshTokenRepository,
    tokens,
    (work) => work({} as EntityManager),
  );
  return { service, users, repo, tokens };
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  const error: unknown = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).code).toBe(code);
}

function storedToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return { id: 1, userId: 7, familyId: 'family-1', revokedAt: null, ...overrides } as RefreshToken;
}

describe('AuthService.login', () => {
  it('issues tokens and stores only a hash of the refresh token', async () => {
    const { service, repo, tokens } = setup();
    const result = await service.login({ email: 'a@example.com', password: PASSWORD }, client);
    const [inserted] = repo.insert.mock.lastCall as [{ tokenHash: string }];
    expect(inserted.tokenHash).toBe(tokens.hash(result.refreshToken));
    expect(inserted.tokenHash).not.toBe(result.refreshToken);
  });

  it('returns the same error for an unknown email', async () => {
    const { service, users } = setup(null);
    await expectCode(
      service.login({ email: 'x@example.com', password: PASSWORD }, client),
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    );
    expect(users.recordFailedLogin).not.toHaveBeenCalled();
  });

  it('records a failure with the lockout policy on a wrong password', async () => {
    const { service, users } = setup();
    await expectCode(
      service.login({ email: 'a@example.com', password: 'wrong' }, client),
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    );
    expect(users.recordFailedLogin).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ maxAttempts: MAX_FAILED_LOGIN_ATTEMPTS }),
    );
  });

  it('rejects a locked account even with the right password', async () => {
    const { service, repo } = setup(authRecord({ lockedUntil: new Date(Date.now() + 60_000) }));
    await expectCode(
      service.login({ email: 'a@example.com', password: PASSWORD }, client),
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    );
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it('allows login after a lock has expired and clears the failure state', async () => {
    const { service, users } = setup(authRecord({ lockedUntil: new Date(Date.now() - 1000) }));
    await service.login({ email: 'a@example.com', password: PASSWORD }, client);
    expect(users.clearLoginFailures).toHaveBeenCalledWith(7);
  });

  it.each(['inactive', 'suspended'] as const)('rejects a %s account', async (status) => {
    const { service } = setup(authRecord({ status }));
    await expectCode(
      service.login({ email: 'a@example.com', password: PASSWORD }, client),
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    );
  });
});

describe('AuthService.refresh', () => {
  it('rotates: revokes the old token and keeps the same family', async () => {
    const { service, repo, tokens } = setup();
    const { token } = tokens.signRefreshToken(7);
    repo.findByHash.mockResolvedValue(storedToken());
    const result = await service.refresh(token, client);
    expect(repo.revokeIfActive).toHaveBeenCalledWith(1);
    expect(repo.insert).toHaveBeenCalledWith(expect.objectContaining({ familyId: 'family-1' }));
    expect(result.refreshToken).not.toBe(token);
  });

  it('revokes the whole family when a revoked token is reused', async () => {
    const { service, repo, tokens } = setup();
    const { token } = tokens.signRefreshToken(7);
    repo.findByHash.mockResolvedValue(storedToken({ revokedAt: new Date() }));
    await expectCode(service.refresh(token, client), ERROR_CODES.AUTH_REFRESH_INVALID);
    expect(repo.revokeFamily).toHaveBeenCalledWith('family-1');
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it('treats losing a concurrent rotation as reuse', async () => {
    const { service, repo, tokens } = setup();
    const { token } = tokens.signRefreshToken(7);
    repo.findByHash.mockResolvedValue(storedToken());
    repo.revokeIfActive.mockResolvedValue(false);
    await expectCode(service.refresh(token, client), ERROR_CODES.AUTH_REFRESH_INVALID);
    expect(repo.revokeFamily).toHaveBeenCalledWith('family-1');
  });

  it('rejects a token that fails signature verification before touching storage', async () => {
    const { service, repo } = setup();
    await expectCode(service.refresh('not-a-jwt', client), ERROR_CODES.AUTH_REFRESH_INVALID);
    expect(repo.findByHash).not.toHaveBeenCalled();
  });

  it('revokes the session when the user is no longer active', async () => {
    const { service, repo, tokens } = setup(authRecord({ status: 'suspended' }));
    const { token } = tokens.signRefreshToken(7);
    repo.findByHash.mockResolvedValue(storedToken());
    await expectCode(service.refresh(token, client), ERROR_CODES.AUTH_REFRESH_INVALID);
    expect(repo.revokeFamily).toHaveBeenCalledWith('family-1');
  });
});

describe('AuthService.changePassword', () => {
  it('updates the hash and revokes all sessions', async () => {
    const { service, users, repo } = setup();
    await service.changePassword(7, { currentPassword: PASSWORD, newPassword: 'another-password' });
    const newHash = users.updatePasswordHash.mock.calls[0][1];
    expect(await bcrypt.compare('another-password', newHash)).toBe(true);
    expect(repo.revokeAllForUser).toHaveBeenCalledWith(7);
  });

  it('rejects a wrong current password without changing anything', async () => {
    const { service, users } = setup();
    await expectCode(
      service.changePassword(7, { currentPassword: 'wrong', newPassword: 'another-password' }),
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    );
    expect(users.updatePasswordHash).not.toHaveBeenCalled();
  });
});
