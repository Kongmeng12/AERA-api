import { config as loadDotenv } from 'dotenv';

// Values match docker-compose.test.yml. An optional .env.test can override them.
loadDotenv({ path: '.env.test', quiet: true });

const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DB_HOST: '127.0.0.1',
  DB_PORT: '33306',
  DB_USERNAME: 'aera_test',
  DB_PASSWORD: 'aera_test_password',
  DB_DATABASE: 'aera_mineral_test',
  JWT_ACCESS_SECRET: 'test-only-access-secret-at-least-32-characters',
  JWT_REFRESH_SECRET: 'test-only-refresh-secret-at-least-32-characters',
  BCRYPT_ROUNDS: '4',
  CORS_ORIGIN: 'http://allowed.example',
  RATE_LIMIT_MAX: '100000',
  AUTH_RATE_LIMIT_MAX: '100000',
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] ??= value;
}
