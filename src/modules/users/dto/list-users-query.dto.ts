import type { z } from 'zod';
import type { listUsersQuerySchema } from '../validators/user.validator';

export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;
