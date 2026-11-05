import { IsNull, LessThan, type EntityManager, type Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';

export type NewRefreshToken = Pick<
  RefreshToken,
  'userId' | 'tokenHash' | 'familyId' | 'expiresAt' | 'userAgent' | 'ipAddress'
>;

export class RefreshTokenRepository {
  constructor(private readonly repo: Repository<RefreshToken>) {}

  withManager(manager: EntityManager): RefreshTokenRepository {
    return new RefreshTokenRepository(manager.getRepository(RefreshToken));
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repo.findOneBy({ tokenHash });
  }

  async insert(token: NewRefreshToken): Promise<void> {
    await this.repo.insert(token);
  }

  /** Conditional update: of two concurrent callers, exactly one sees `true`. */
  async revokeIfActive(id: number): Promise<boolean> {
    const result = await this.repo.update({ id, revokedAt: IsNull() }, { revokedAt: new Date() });
    return result.affected === 1;
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.repo.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.repo.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async deleteExpiredForUser(userId: number): Promise<void> {
    await this.repo.delete({ userId, expiresAt: LessThan(new Date()) });
  }
}
