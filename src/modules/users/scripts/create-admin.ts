import { z } from 'zod';
import { AppDataSource } from '../../../core/database/data-source';
import { ROLES } from '../../../shared/constants/roles';
import { logger } from '../../../shared/logger/logger';
import { createRolesModule } from '../../roles/roles.module';
import { createUsersModule } from '../users.module';
import { createUserSchema } from '../validators/user.validator';

/** Creates the first admin, which cannot be created through the admin-only API. */
async function main(): Promise<void> {
  const input = z
    .object({ ADMIN_USERNAME: z.string(), ADMIN_EMAIL: z.string(), ADMIN_PASSWORD: z.string() })
    .parse(process.env);
  if (input.ADMIN_PASSWORD.startsWith('replace_')) {
    throw new Error('ADMIN_PASSWORD must not be a placeholder');
  }

  await AppDataSource.initialize();
  try {
    const { roleLookup } = createRolesModule(AppDataSource);
    const { service } = createUsersModule(AppDataSource, roleLookup);
    const roleId = await roleLookup.findIdByName(ROLES.ADMIN);
    if (roleId === null) {
      throw new Error('Admin role not found. Run migrations first.');
    }
    const admin = await service.create(
      createUserSchema.parse({
        username: input.ADMIN_USERNAME,
        email: input.ADMIN_EMAIL,
        password: input.ADMIN_PASSWORD,
        roleId,
      }),
    );
    logger.info({ userId: admin.id }, 'Admin user created');
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  logger.error({ reason: error instanceof Error ? error.message : 'unknown' }, 'Seeding failed');
  process.exitCode = 1;
});
