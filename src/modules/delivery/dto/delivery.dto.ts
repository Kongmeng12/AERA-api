import { z } from 'zod';
import type {
  createDeliverySchema,
  listDeliveriesQuerySchema,
} from '../validators/delivery.validator';
import type { Delivery, DeliveryLine } from '../entities/delivery.entity';

export type CreateDeliveryDto = z.infer<typeof createDeliverySchema>;
export type ListDeliveriesQueryDto = z.infer<typeof listDeliveriesQuerySchema>;

export const deliveryLineResponseSchema = z.object({
  id: z.number().int(),
  salesOrderLineId: z.number().int(),
  lineNumber: z.number().int(),
  plannedQuantity: z.string(),
  loadedQuantity: z.string(),
  deliveredQuantity: z.string(),
  returnedQuantity: z.string(),
});

export const deliveryResponseSchema = z.object({
  id: z.number().int(),
  deliveryNumber: z.string(),
  salesOrderId: z.number().int(),
  plannedAt: z.string(),
  routeId: z.number().int().nullable(),
  vehicleId: z.number().int().nullable(),
  driverId: z.number().int().nullable(),
  status: z.string(),
  departedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  notes: z.string().nullable(),
  lines: z.array(deliveryLineResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DeliveryResponseDto = z.infer<typeof deliveryResponseSchema>;

export function toDeliveryResponse(
  delivery: Delivery,
  salesOrderId: number,
  lines: DeliveryLine[],
): DeliveryResponseDto {
  return {
    id: delivery.id,
    deliveryNumber: delivery.deliveryNumber,
    salesOrderId,
    plannedAt: delivery.plannedAt.toISOString(),
    routeId: delivery.routeId,
    vehicleId: delivery.vehicleId,
    driverId: delivery.driverId,
    status: delivery.status,
    departedAt: delivery.departedAt?.toISOString() ?? null,
    completedAt: delivery.completedAt?.toISOString() ?? null,
    notes: delivery.notes,
    lines: lines.map((line) => ({
      id: line.id,
      salesOrderLineId: line.salesOrderLineId,
      lineNumber: line.lineNumber,
      plannedQuantity: line.plannedQuantity,
      loadedQuantity: line.loadedQuantity,
      deliveredQuantity: line.deliveredQuantity,
      returnedQuantity: line.returnedQuantity,
    })),
    createdAt: delivery.createdAt.toISOString(),
    updatedAt: delivery.updatedAt.toISOString(),
  };
}
