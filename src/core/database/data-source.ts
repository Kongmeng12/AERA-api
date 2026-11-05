import 'reflect-metadata';
import path from 'node:path';
import { DataSource } from 'typeorm';
import { databaseConfig } from '../../config/database.config';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  ...databaseConfig,
  charset: 'utf8mb4',
  timezone: 'Z',
  synchronize: false,
  // TypeORM's logger prints SQL parameters, which include password and token hashes.
  logging: false,
  entities: [Role, User, RefreshToken],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  poolSize: 10,
});
