import { ConflictError, NotFoundError, ValidationError } from '../../../core/exceptions/app-error';
import { ERROR_CODES } from '../../../shared/constants/error-codes';
import { formatDecimal4, parseDecimal4 } from '../../../shared/helpers/decimal';
import { toPaginatedResult } from '../../../shared/helpers/pagination';
import type { PaginatedResult } from '../../../shared/response/api-response';
import type { InventoryService } from '../../inventory/services/inventory.service';
import type { SalesService } from '../../sales/services/sales.service';
import {
  toDeliveryResponse,
  type CreateDeliveryDto,
  type DeliveryResponseDto,
  type ListDeliveriesQueryDto,
} from '../dto/delivery.dto';
import type { DeliveryRepository } from '../repositories/delivery.repository';

function fieldError(field: string, message: string): ValidationError {
  return new ValidationError(ERROR_CODES.VALIDATION_ERROR, 'Validation failed', [
    { field, message },
  ]);
}

export class DeliveryService {
  constructor(
    private readonly repository: DeliveryRepository,
    private readonly sales: SalesService,
    private readonly inventory: InventoryService,
  ) {}

  async list(query: ListDeliveriesQueryDto): Promise<PaginatedResult<DeliveryResponseDto>> {
    const [deliveries, total] = await this.repository.findDeliveries(query);
    const deliveryOrders = await this.repository.findDeliveryOrders(
      deliveries.map((delivery) => delivery.id),
    );
    const lines = await this.repository.findDeliveryLines(
      deliveryOrders.map((deliveryOrder) => deliveryOrder.id),
    );
    const deliveryOrderById = new Map(
      deliveryOrders.map((deliveryOrder) => [deliveryOrder.deliveryId, deliveryOrder]),
    );
    const linesByDeliveryOrder = new Map<number, typeof lines>();
    for (const line of lines) {
      const current = linesByDeliveryOrder.get(line.deliveryOrderId) ?? [];
      current.push(line);
      linesByDeliveryOrder.set(line.deliveryOrderId, current);
    }
    return toPaginatedResult(
      deliveries.map((delivery) => {
        const deliveryOrder = deliveryOrderById.get(delivery.id);
        if (!deliveryOrder) {
          throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, 'Delivery order link is missing');
        }
        return toDeliveryResponse(
          delivery,
          deliveryOrder.salesOrderId,
          linesByDeliveryOrder.get(deliveryOrder.id) ?? [],
        );
      }),
      total,
      query.page,
      query.limit,
    );
  }

  async get(id: number): Promise<DeliveryResponseDto> {
    const delivery = await this.repository.findDelivery(id);
    if (!delivery) {
      throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Delivery not found');
    }
    const [deliveryOrder] = await this.repository.findDeliveryOrders([delivery.id]);
    if (!deliveryOrder) {
      throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, 'Delivery order link is missing');
    }
    const lines = await this.repository.findDeliveryLines([deliveryOrder.id]);
    return toDeliveryResponse(delivery, deliveryOrder.salesOrderId, lines);
  }

  async create(dto: CreateDeliveryDto, createdById: number): Promise<DeliveryResponseDto> {
    return this.repository.transaction(async (repository, manager) => {
      const { order, lines: orderLines } = await this.sales.lockOrderForDelivery(
        manager,
        dto.salesOrderId,
      );
      const orderLinesById = new Map(orderLines.map((line) => [line.id, line]));
      const lineIds = dto.lines.map((line) => line.salesOrderLineId);
      if (new Set(lineIds).size !== lineIds.length) {
        throw fieldError('lines', 'An order line may appear only once in a delivery');
      }
      if (lineIds.some((id) => !orderLinesById.has(id))) {
        throw fieldError('lines', 'One or more delivery lines do not belong to this order');
      }
      if (dto.routeId && !(await repository.findRoute(dto.routeId))) {
        throw fieldError('routeId', 'Route does not exist or is inactive');
      }
      if (dto.vehicleId && !(await repository.findVehicle(dto.vehicleId))) {
        throw fieldError('vehicleId', 'Vehicle does not exist or is inactive');
      }
      if (dto.driverId && !(await repository.findDriver(dto.driverId))) {
        throw fieldError('driverId', 'Driver does not exist or is inactive');
      }

      for (const [index, input] of dto.lines.entries()) {
        const reserved = parseDecimal4(
          (await repository.findReservedQuantity(input.salesOrderLineId))?.quantity ?? '0.0000',
        );
        const alreadyPlanned = parseDecimal4(
          (await repository.findQuantityPlannedForDispatch(input.salesOrderLineId))?.quantity ??
            '0.0000',
        );
        const requested = parseDecimal4(input.plannedQuantity);
        if (requested > reserved - alreadyPlanned) {
          throw fieldError(
            `lines.${index}.plannedQuantity`,
            'Planned quantity exceeds the order line stock reserved and not yet assigned to a delivery',
          );
        }
      }

      const delivery = await repository.createDelivery({
        deliveryNumber: dto.deliveryNumber,
        plannedAt: new Date(dto.plannedAt),
        routeId: dto.routeId ?? null,
        vehicleId: dto.vehicleId ?? null,
        driverId: dto.driverId ?? null,
        createdById,
        status: 'planned',
        departedAt: null,
        completedAt: null,
        notes: dto.notes ?? null,
      });
      const deliveryOrder = await repository.createDeliveryOrder({
        deliveryId: delivery.id,
        salesOrderId: order.id,
      });
      const deliveryLines = await repository.createDeliveryLines(
        dto.lines.map((line, index) => ({
          deliveryOrderId: deliveryOrder.id,
          salesOrderLineId: line.salesOrderLineId,
          lineNumber: index + 1,
          plannedQuantity: formatDecimal4(parseDecimal4(line.plannedQuantity)),
          loadedQuantity: '0.0000',
          deliveredQuantity: '0.0000',
          returnedQuantity: '0.0000',
        })),
      );
      return toDeliveryResponse(delivery, order.id, deliveryLines);
    });
  }

  async dispatch(id: number, actorId: number): Promise<DeliveryResponseDto> {
    return this.repository.transaction(async (repository, manager) => {
      const delivery = await repository.findDeliveryForUpdate(id);
      if (!delivery) {
        throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Delivery not found');
      }
      if (delivery.status !== 'planned') {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only planned deliveries can be dispatched',
        );
      }
      const deliveryOrder = await repository.findDeliveryOrderForUpdate(delivery.id);
      if (!deliveryOrder) {
        throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, 'Delivery order link is missing');
      }
      const lines = await repository.findDeliveryLinesForUpdate(deliveryOrder.id);
      for (const line of lines) {
        await this.inventory.dispatchSalesOrderLine(manager, {
          salesOrderLineId: line.salesOrderLineId,
          quantity: line.plannedQuantity,
          deliveryId: delivery.id,
          actorId,
        });
        await repository.updateDeliveryLine(line.id, {
          loadedQuantity: line.plannedQuantity,
          deliveredQuantity: '0.0000',
          returnedQuantity: '0.0000',
        });
      }
      const departedAt = new Date();
      await repository.updateDeliveryStatus(delivery.id, {
        status: 'in_transit',
        departedAt,
        completedAt: null,
      });
      return toDeliveryResponse(
        { ...delivery, status: 'in_transit', departedAt },
        deliveryOrder.salesOrderId,
        lines.map((line) => ({ ...line, loadedQuantity: line.plannedQuantity })),
      );
    });
  }

  async complete(
    id: number,
    invoiceNumber: string | undefined,
    inputLines: Array<{
      deliveryLineId: number;
      deliveredQuantity: string;
      returnedQuantity: string;
    }>,
    actorId: number,
  ) {
    return this.repository.transaction(async (repository, manager) => {
      const delivery = await repository.findDeliveryForUpdate(id);
      if (!delivery) {
        throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'Delivery not found');
      }
      if (delivery.status !== 'in_transit') {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only in-transit deliveries can be completed',
        );
      }
      const deliveryOrder = await repository.findDeliveryOrderForUpdate(delivery.id);
      if (!deliveryOrder) {
        throw new ConflictError(ERROR_CODES.RESOURCE_CONFLICT, 'Delivery order link is missing');
      }
      const lines = await repository.findDeliveryLinesForUpdate(deliveryOrder.id);
      if (
        new Set(inputLines.map((line) => line.deliveryLineId)).size !== inputLines.length ||
        inputLines.length !== lines.length
      ) {
        throw fieldError('lines', 'Completion must include every delivery line exactly once');
      }
      const inputById = new Map(inputLines.map((line) => [line.deliveryLineId, line]));
      const orderLinesToInvoice: Array<{ salesOrderLineId: number; quantity: string }> = [];
      let totalDelivered = 0n;

      for (const [index, line] of lines.entries()) {
        const input = inputById.get(line.id);
        if (!input) {
          throw fieldError(`lines.${index}`, 'Delivery line is missing from completion');
        }
        const delivered = parseDecimal4(input.deliveredQuantity);
        const returned = parseDecimal4(input.returnedQuantity);
        if (delivered + returned !== parseDecimal4(line.loadedQuantity)) {
          throw fieldError(
            `lines.${index}`,
            'Delivered plus returned quantity must equal the loaded quantity',
          );
        }
        if (returned > 0n) {
          await this.inventory.returnUndeliveredSalesLine(manager, {
            deliveryId: delivery.id,
            salesOrderLineId: line.salesOrderLineId,
            quantity: formatDecimal4(returned),
            actorId,
          });
        }
        await repository.updateDeliveryLine(line.id, {
          loadedQuantity: line.loadedQuantity,
          deliveredQuantity: formatDecimal4(delivered),
          returnedQuantity: formatDecimal4(returned),
        });
        if (delivered > 0n) {
          totalDelivered += delivered;
          orderLinesToInvoice.push({
            salesOrderLineId: line.salesOrderLineId,
            quantity: formatDecimal4(delivered),
          });
        }
      }
      let invoice: Awaited<ReturnType<SalesService['createInvoiceForDelivery']>> | null = null;
      if (totalDelivered > 0n) {
        if (!invoiceNumber) {
          throw fieldError('invoiceNumber', 'An invoice number is required for delivered goods');
        }
        invoice = await this.sales.createInvoiceForDelivery(manager, {
          orderId: deliveryOrder.salesOrderId,
          invoiceNumber,
          deliveredLines: orderLinesToInvoice,
        });
      }
      const completedAt = new Date();
      await repository.updateDeliveryStatus(delivery.id, {
        status: 'completed',
        departedAt: delivery.departedAt,
        completedAt,
      });
      const updatedDelivery = { ...delivery, status: 'completed', completedAt };
      const updatedLines = await repository.findDeliveryLines([deliveryOrder.id]);
      return {
        delivery: toDeliveryResponse(updatedDelivery, deliveryOrder.salesOrderId, updatedLines),
        invoice,
      };
    });
  }
}
