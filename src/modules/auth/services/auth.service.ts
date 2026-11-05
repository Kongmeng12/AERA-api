import { randomUUID } from 'node:crypto';
import type { TransactionRunner } from '../../../core/interfaces/transaction-runner.interface';
import { UnauthorizedError } from '../../../core/exceptions/app-error';
import { ERROR_CODES } from '../../../shared/constants/error-codes';
import { signAccessToken } from '../../../shared/helpers/access-token';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../../shared/helpers/password';
import { logger } from '../../../shared/logger/logger';
import type { UserAuthRecord, UserCredentialStore } from '../../users/interfaces/user.interface';
import type { ChangePasswordDto, LoginDto } from '../dto/auth-request.dto';
import type { TokenPairDto } from '../dto/auth-response.dto';
import type { ClientMetadata } from '../interfaces/auth.interface';
import type { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import type { TokenService } from './token.service';

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

// One message for every login failure, so responses do not reveal which accounts exist.
function invalidCredentials(): UnauthorizedError {
  return new UnauthorizedError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid email or password');
}

function invalidRefreshToken(): UnauthorizedError {
  return new UnauthorizedError(
    ERROR_CODES.AUTH_REFRESH_INVALID,
    'Refresh token is invalid or expired',
  );
}

export class AuthService {
  constructor(
    private readonly users: UserCredentialStore,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: TokenService,
    private readonly transaction: TransactionRunner,
  ) {}

  async login(dto: LoginDto, client: ClientMetadata): Promise<TokenPairDto> {
    const user = await this.users.findAuthRecordByEmail(dto.email);
    if (!user) {
      await burnPasswordCheck(dto.password);
      throw invalidCredentials();
    }

    // Always verify first so locked and inactive accounts take the same time to answer.
    const passwordMatches = await verifyPassword(dto.password, user.passwordHash);
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      logger.warn({ userId: user.id }, 'Login rejected: account locked');
      throw invalidCredentials();
    }
    if (!passwordMatches) {
      await this.users.recordFailedLogin(user.id, {
        maxAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
        lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
      });
      logger.warn({ userId: user.id }, 'Login rejected: wrong password');
      throw invalidCredentials();
    }
    if (user.status !== 'active') {
      logger.warn({ userId: user.id, status: user.status }, 'Login rejected: account not active');
      throw invalidCredentials();
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.users.clearLoginFailures(user.id);
    }
    await this.refreshTokens.deleteExpiredForUser(user.id);
    return this.issueTokens(user, randomUUID(), client, this.refreshTokens);
  }

  async refresh(refreshToken: string, client: ClientMetadata): Promise<TokenPairDto> {
    this.tokens.verifyRefreshToken(refreshToken);

    const stored = await this.refreshTokens.findByHash(this.tokens.hash(refreshToken));
    if (!stored) {
      throw invalidRefreshToken();
    }
    if (stored.revokedAt) {
      await this.handleReuse(stored.familyId, stored.userId);
      throw invalidRefreshToken();
    }

    // Reading the user here means role changes and deactivation apply at the next refresh.
    const user = await this.users.findAuthRecordById(stored.userId);
    if (!user || user.status !== 'active') {
      await this.refreshTokens.revokeFamily(stored.familyId);
      throw invalidRefreshToken();
    }

    const pair = await this.transaction(async (manager) => {
      const repository = this.refreshTokens.withManager(manager);
      if (!(await repository.revokeIfActive(stored.id))) {
        return null;
      }
      return this.issueTokens(user, stored.familyId, client, repository);
    });
    if (!pair) {
      // Lost a race for the same token. Revoke outside the transaction so it stays committed.
      await this.handleReuse(stored.familyId, stored.userId);
      throw invalidRefreshToken();
    }
    return pair;
  }

  /** Idempotent: an unknown token still succeeds, so this reveals nothing about tokens. */
  async logout(refreshToken: string): Promise<void> {
    const stored = await this.refreshTokens.findByHash(this.tokens.hash(refreshToken));
    if (stored) {
      await this.refreshTokens.revokeFamily(stored.familyId);
    }
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.users.findAuthRecordById(userId);
    if (!user || !(await verifyPassword(dto.currentPassword, user.passwordHash))) {
      throw invalidCredentials();
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await this.transaction(async (manager) => {
      await this.users.updatePasswordHash(userId, passwordHash, manager);
      await this.refreshTokens.withManager(manager).revokeAllForUser(userId);
    });
  }

  private async handleReuse(familyId: string, userId: number): Promise<void> {
    await this.refreshTokens.revokeFamily(familyId);
    logger.warn({ userId, familyId }, 'Refresh token reuse detected; session revoked');
  }

  private async issueTokens(
    user: UserAuthRecord,
    familyId: string,
    client: ClientMetadata,
    repository: RefreshTokenRepository,
  ): Promise<TokenPairDto> {
    const refresh = this.tokens.signRefreshToken(user.id);
    await repository.insert({
      userId: user.id,
      tokenHash: refresh.tokenHash,
      familyId,
      expiresAt: refresh.expiresAt,
      userAgent: client.userAgent,
      ipAddress: client.ipAddress,
    });
    return {
      tokenType: 'Bearer',
      accessToken: signAccessToken({ userId: user.id, role: user.role }),
      refreshToken: refresh.token,
    };
  }
}
