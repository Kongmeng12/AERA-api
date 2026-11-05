import type { Router } from 'express';
import type { DataSource } from 'typeorm';
import type { UsersModule } from '../users/users.module';
import { AuthController } from './controllers/auth.controller';
import { RefreshToken } from './entities/refresh-token.entity';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { createAuthRouter } from './routes/auth.routes';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';

export function createAuthModule(dataSource: DataSource, users: UsersModule['service']): Router {
  const service = new AuthService(
    users,
    new RefreshTokenRepository(dataSource.getRepository(RefreshToken)),
    new TokenService(),
    (work) => dataSource.transaction(work),
  );
  return createAuthRouter(new AuthController(service, users));
}
