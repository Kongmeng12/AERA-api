import { z } from 'zod';
import { paginationQueryShape } from '../../../shared/helpers/pagination';

const idSchema = z.coerce.number().int().min(1).max(4_294_967_295);

export const listInventoryBalancesQuerySchema = z.object({
  ...paginationQueryShape,
  itemId: idSchema.optional(),
  warehouseId: idSchema.optional(),
  zoneId: idSchema.optional(),
  stockStatus: z.string().trim().min(1).max(20).optional(),
});

export const listStockBatchesQuerySchema = z.object({
  ...paginationQueryShape,
  itemId: idSchema.optional(),
  qcStatus: z.string().trim().min(1).max(20).optional(),
  status: z.string().trim().min(1).max(20).optional(),
});

export const listStockMovementsQuerySchema = z.object({
  ...paginationQueryShape,
  itemId: idSchema.optional(),
  movementType: z.string().trim().min(1).max(30).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});
