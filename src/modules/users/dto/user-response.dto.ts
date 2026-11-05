import { z } from 'zod';
import { USER_STATUSES } from '../interfaces/user.interface';
import type { User } from '../entities/user.entity';

export const userResponseSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  email: z.string(),
  status: z.enum(USER_STATUSES),
  role: z.object({ id: z.number().int(), name: z.string() }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserResponseDto = z.infer<typeof userResponseSchema>;

/** Builds the response field by field so secrets on the entity can never leak. */
export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    status: user.status,
    role: { id: user.role.id, name: user.role.name },
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
