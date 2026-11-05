import { z } from 'zod';
import type { Role } from '../entities/role.entity';

export const roleResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
});

export type RoleResponseDto = z.infer<typeof roleResponseSchema>;

export function toRoleResponse(role: Role): RoleResponseDto {
  return { id: role.id, name: role.name, description: role.description };
}
