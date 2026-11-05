import type { z } from 'zod';
import type { patchUserSchema } from '../validators/user.validator';

/** PUT supplies every field; PATCH supplies a subset. */
export type UpdateUserDto = z.infer<typeof patchUserSchema>;
