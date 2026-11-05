import type { z } from 'zod';
import type { createUserSchema } from '../validators/user.validator';

export type CreateUserDto = z.infer<typeof createUserSchema>;
