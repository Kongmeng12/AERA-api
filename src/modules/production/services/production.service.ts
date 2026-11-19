import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError, ValidationError } from '../../../core/exceptions/app-error';
import { ERROR_CODES } from '../../../shared/constants/error-codes';
import { addDecimal4, formatDecimal4, parseDecimal4 } from '../../../shared/helpers/decimal';
import { toPaginatedResult } from '../../../shared/helpers/pagination';
import type { PaginatedResult } from '../../../shared/response/api-response';
import type {
  BomResponseDto,
  CreateBomDto,
  CreateProductionOrderDto,
  IssueMaterialsDto,
  ListBomsQueryDto,
  ListProductionOrdersQueryDto,
  ProductionOrderResponseDto,
  RecordOutputDto,
} from '../dto/production.dto';
import { toBomResponse, toProductionOrderResponse } from '../dto/production.dto';
import type { BillOfMaterialLine } from '../entities/production.entity';
import type { ProductionRepository } from '../repositories/production.repository';

const ZERO = '0.0000';
const SCALE6 = 1_000_000n;
const SCALE4 = 10_000n;

function error(field: string, message: string): ValidationError {
  return new ValidationError(ERROR_CODES.VALIDATION_ERROR, 'Validation failed', [
    { field, message },
  ]);
}
function decimalToScaled(value: string, scale: number): bigint {
  const [whole, fraction = ''] = value.split('.');
  return (
    BigInt(whole) * 10n ** BigInt(scale) +
    BigInt(fraction.padEnd(scale, '0').slice(0, scale) || '0')
  );
}
function requiredQuantity(line: BillOfMaterialLine, planned: string): bigint {
  const quantity6 = decimalToScaled(line.quantity, 6);
  const planned4 = decimalToScaled(planned, 4);
  const scrap4 = decimalToScaled(line.scrapPercent, 4);
  const numerator = quantity6 * planned4 * (SCALE4 + scrap4);
  const denominator = SCALE6 * SCALE4;
  return (numerator + denominator - 1n) / denominator;
}
function format4(value: bigint): string {
  return formatDecimal4(value);
}
function notFound(message: string): NotFoundError {
  return new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, message);
}

export class ProductionService {
  constructor(private readonly repository: ProductionRepository) {}

  async listBoms(query: ListBomsQueryDto): Promise<PaginatedResult<BomResponseDto>> {
    const [boms, total] = await this.repository.listBoms(query);
    const lines = await this.repository.findBomLines(boms.map((bom) => bom.id));
    const byBom = new Map<number, BillOfMaterialLine[]>();
    for (const line of lines)
      byBom.set(line.billOfMaterialsId, [...(byBom.get(line.billOfMaterialsId) ?? []), line]);
    return toPaginatedResult(
      boms.map((bom) => toBomResponse(bom, byBom.get(bom.id) ?? [])),
      total,
      query.page,
      query.limit,
    );
  }

  async getBom(id: number): Promise<BomResponseDto> {
    const bom = await this.repository.findBom(id);
    if (!bom) throw notFound('Bill of materials not found');
    return toBomResponse(bom, await this.repository.findBomLines([id]));
  }

  async createBom(dto: CreateBomDto): Promise<BomResponseDto> {
    const item = await this.repository.findItem(dto.itemId);
    if (!item) throw error('itemId', 'Production item does not exist or is inactive');
    const materialIds = [...new Set(dto.lines.map((line) => line.materialItemId))];
    const unitIds = [...new Set(dto.lines.map((line) => line.unitId))];
    const [items, units, conversions] = await Promise.all([
      this.repository.findItems(materialIds),
      this.repository.findUnits(unitIds),
      this.repository.findConversions(materialIds),
    ]);
    const itemById = new Map(items.map((entry) => [entry.id, entry]));
    const unitSet = new Set(units.map((unit) => unit.id));
    for (const [index, line] of dto.lines.entries()) {
      const material = itemById.get(line.materialItemId);
      if (!material)
        throw error(`lines.${index}.materialItemId`, 'Material does not exist or is inactive');
      if (!unitSet.has(line.unitId)) throw error(`lines.${index}.unitId`, 'Unit does not exist');
      if (
        line.unitId !== material.baseUnitId &&
        !conversions.some((c) => c.itemId === material.id && c.unitId === line.unitId)
      ) {
        throw error(`lines.${index}.unitId`, 'Unit is not configured for this material');
      }
    }
    const bom = await this.repository.transaction(async (repo) => {
      const created = await repo.createBom({
        itemId: item.id,
        revision: dto.revision,
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: dto.effectiveTo ?? null,
        status: 'draft',
      });
      await repo.createBomLines(
        dto.lines.map((line, index) => ({
          billOfMaterialsId: created.id,
          lineNumber: index + 1,
          materialItemId: line.materialItemId,
          unitId: line.unitId,
          quantity: line.quantity,
          scrapPercent: line.scrapPercent,
        })),
      );
      return created;
    });
    return this.getBom(bom.id);
  }

  async activateBom(id: number): Promise<BomResponseDto> {
    await this.repository.transaction(async (repo) => {
      const bom = await repo.findBomForUpdate(id);
      if (!bom) throw notFound('Bill of materials not found');
      if (bom.status !== 'draft')
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only draft bills of materials can be activated',
        );
      const today = new Date().toISOString().slice(0, 10);
      if (bom.effectiveTo && bom.effectiveTo < today)
        throw error('effectiveTo', 'Expired bill of materials cannot be activated');
      await repo.setBomStatus(bom.id, 'active');
    });
    return this.getBom(id);
  }

  async listOrders(
    query: ListProductionOrdersQueryDto,
  ): Promise<PaginatedResult<ProductionOrderResponseDto>> {
    const [orders, total] = await this.repository.listOrders(query);
    const [issues, outputs] = await Promise.all([
      this.repository.findIssues(orders.map((order) => order.id)),
      this.repository.findOutputs(orders.map((order) => order.id)),
    ]);
    return toPaginatedResult(
      orders.map((order) =>
        toProductionOrderResponse(
          order,
          issues.filter((issue) => issue.productionOrderId === order.id),
          outputs.filter((output) => output.productionOrderId === order.id),
        ),
      ),
      total,
      query.page,
      query.limit,
    );
  }

  async getOrder(id: number): Promise<ProductionOrderResponseDto> {
    const order = await this.repository.findOrder(id);
    if (!order) throw notFound('Production order not found');
    const [issues, outputs] = await Promise.all([
      this.repository.findIssues([id]),
      this.repository.findOutputs([id]),
    ]);
    return toProductionOrderResponse(order, issues, outputs);
  }

  async createOrder(dto: CreateProductionOrderDto): Promise<ProductionOrderResponseDto> {
    const bom = await this.repository.findBom(dto.billOfMaterialsId);
    if (!bom || bom.status !== 'active')
      throw error('billOfMaterialsId', 'An active bill of materials is required');
    const today = dto.plannedStartAt.slice(0, 10);
    if (today < bom.effectiveFrom || (bom.effectiveTo && today > bom.effectiveTo)) {
      throw error(
        'billOfMaterialsId',
        'Bill of materials is not effective on the planned start date',
      );
    }
    const item = await this.repository.findItem(bom.itemId);
    if (!item) throw error('billOfMaterialsId', 'Production item does not exist or is inactive');
    const units = await this.repository.findUnits([dto.outputUnitId]);
    if (!units.length || dto.outputUnitId !== item.baseUnitId) {
      throw error(
        'outputUnitId',
        'Production output must use the item base unit; alternate-unit conversion is not supported',
      );
    }
    const order = await this.repository.createOrder({
      productionOrderNumber: dto.productionOrderNumber,
      billOfMaterialsId: bom.id,
      itemId: item.id,
      plannedQuantity: dto.plannedQuantity,
      actualQuantity: ZERO,
      outputUnitId: dto.outputUnitId,
      plannedStartAt: new Date(dto.plannedStartAt),
      actualStartAt: null,
      completedAt: null,
      startedById: null,
      status: 'planned',
      notes: dto.notes ?? null,
    });
    return this.getOrder(order.id);
  }

  async issueMaterials(
    id: number,
    dto: IssueMaterialsDto,
    actorId: number,
  ): Promise<ProductionOrderResponseDto> {
    await this.repository.transaction(async (repo) => {
      const order = await repo.findOrderForUpdate(id);
      if (!order) throw notFound('Production order not found');
      if (!['planned', 'in_progress'].includes(order.status))
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Materials can only be issued to an open production order',
        );
      const bomLines = await repo.findBomLinesForUpdate(order.billOfMaterialsId);
      const requests = new Map<
        string,
        { materialItemId: number; batchId: number; quantity: bigint; unitId: number }
      >();
      for (const line of dto.lines) {
        const bomLine = bomLines.find(
          (candidate) => candidate.materialItemId === line.materialItemId,
        );
        if (!bomLine)
          throw error(
            'lines',
            `Material ${line.materialItemId} is not in the order bill of materials`,
          );
        const key = `${line.materialItemId}:${line.batchId}`;
        const previous = requests.get(key);
        requests.set(key, {
          materialItemId: line.materialItemId,
          batchId: line.batchId,
          quantity: (previous?.quantity ?? 0n) + parseDecimal4(line.quantity),
          unitId: bomLine.unitId,
        });
      }
      const currentIssues = await repo.findIssuesForUpdate(id);
      for (const materialId of new Set([
        ...currentIssues.map((issue) => issue.materialItemId),
        ...[...requests.values()].map((value) => value.materialItemId),
      ])) {
        const bomLine = bomLines.find((line) => line.materialItemId === materialId)!;
        const alreadyIssued = currentIssues
          .filter((issue) => issue.materialItemId === materialId)
          .reduce(
            (sum, issue) =>
              sum + parseDecimal4(issue.issuedQuantity) - parseDecimal4(issue.returnedQuantity),
            0n,
          );
        const requested = [...requests.values()]
          .filter((line) => line.materialItemId === materialId)
          .reduce((sum, line) => sum + line.quantity, 0n);
        if (alreadyIssued + requested > requiredQuantity(bomLine, order.plannedQuantity)) {
          throw error(
            'lines',
            `Issue quantity exceeds the bill of materials requirement for material ${materialId}`,
          );
        }
      }
      for (const request of requests.values()) {
        const balances = await repo.findAvailableBalances(
          request.materialItemId,
          request.unitId,
          request.batchId,
        );
        const available = balances.reduce(
          (sum, balance) =>
            sum + parseDecimal4(balance.quantityOnHand) - parseDecimal4(balance.quantityReserved),
          0n,
        );
        if (available < request.quantity)
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            `Insufficient QC-passed available stock for material ${request.materialItemId}, batch ${request.batchId}`,
          );
        const batch = await repo.findBatchForUpdate(request.batchId);
        if (
          !batch ||
          batch.itemId !== request.materialItemId ||
          batch.qcStatus !== 'passed' ||
          batch.status !== 'active'
        ) {
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            `Batch ${request.batchId} is not active and QC-passed for this material`,
          );
        }
        let remaining = request.quantity;
        let issue = currentIssues.find(
          (entry) =>
            entry.materialItemId === request.materialItemId && entry.batchId === request.batchId,
        );
        if (issue) {
          issue.issuedQuantity = addDecimal4(issue.issuedQuantity, format4(request.quantity));
          issue = await repo.saveIssue(issue);
        } else {
          issue = await repo.saveIssue({
            productionOrderId: id,
            materialItemId: request.materialItemId,
            batchId: request.batchId,
            unitId: request.unitId,
            issuedQuantity: format4(request.quantity),
            returnedQuantity: ZERO,
          });
        }
        let movementIndex = 0;
        for (const balance of balances) {
          if (remaining === 0n) break;
          const free =
            parseDecimal4(balance.quantityOnHand) - parseDecimal4(balance.quantityReserved);
          const take = free < remaining ? free : remaining;
          if (take <= 0n) continue;
          const amount = format4(take);
          balance.quantityOnHand = format4(parseDecimal4(balance.quantityOnHand) - take);
          await repo.saveBalance(balance);
          await repo.createMovement({
            movementNumber: `PI-${issue.id}-${++movementIndex}-${randomUUID().slice(0, 8)}`,
            movementType: 'production_issue',
            itemId: balance.itemId,
            batchId: balance.batchId,
            unitId: balance.unitId,
            quantity: amount,
            fromWarehouseId: balance.warehouseId,
            fromZoneId: balance.zoneId,
            toWarehouseId: null,
            toZoneId: null,
            sourceType: 'production_material_issue',
            sourceId: String(issue.id),
            idempotencyKey: null,
            actorId,
            reason: `production_order:${id}`,
          });
          remaining -= take;
        }
      }
      order.status = 'in_progress';
      order.startedById ??= actorId;
      order.actualStartAt ??= new Date();
      await repo.saveOrder(order);
    });
    return this.getOrder(id);
  }

  async recordOutput(
    id: number,
    dto: RecordOutputDto,
    actorId: number,
  ): Promise<ProductionOrderResponseDto> {
    await this.repository.transaction(async (repo) => {
      const order = await repo.findOrderForUpdate(id);
      if (!order) throw notFound('Production order not found');
      if (order.status !== 'in_progress')
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Production order must be in progress before output can be recorded',
        );
      const bomLines = await repo.findBomLinesForUpdate(order.billOfMaterialsId);
      const issues = await repo.findIssuesForUpdate(id);
      for (const line of bomLines) {
        const required = requiredQuantity(line, order.plannedQuantity);
        const issued = issues
          .filter((issue) => issue.materialItemId === line.materialItemId)
          .reduce(
            (sum, issue) =>
              sum + parseDecimal4(issue.issuedQuantity) - parseDecimal4(issue.returnedQuantity),
            0n,
          );
        if (issued < required)
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            `Required material ${line.materialItemId} has not been fully issued`,
          );
      }
      const outputs = await repo.findOutputs([id]);
      const alreadyProduced = outputs.reduce(
        (sum, output) => sum + parseDecimal4(output.quantity),
        0n,
      );
      const quantity = parseDecimal4(dto.quantity);
      const planned = parseDecimal4(order.plannedQuantity);
      if (alreadyProduced + quantity > planned)
        throw error('quantity', 'Recorded output cannot exceed planned quantity');
      const [warehouse, zone] = await Promise.all([
        repo.findWarehouse(dto.warehouseId),
        repo.findZone(dto.warehouseZoneId),
      ]);
      if (!warehouse) throw error('warehouseId', 'Warehouse does not exist or is inactive');
      if (!zone || zone.warehouseId !== warehouse.id)
        throw error('warehouseZoneId', 'Zone is not active in the selected warehouse');
      if (await repo.findBatchByNumber(order.itemId, dto.batchNumber)) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Batch number already exists for this item',
        );
      }
      const batch = await repo.createBatch({
        itemId: order.itemId,
        batchNumber: dto.batchNumber,
        manufacturedAt: dto.manufacturedAt ?? null,
        expiresAt: dto.expiresAt ?? null,
        qcStatus: 'pending',
        sourceType: 'production_order',
        sourceId: String(order.id),
        status: 'active',
      });
      const output = await repo.createOutput({
        productionOrderId: order.id,
        batchId: batch.id,
        unitId: order.outputUnitId,
        quantity: dto.quantity,
      });
      await repo.addQcHoldBalance({
        itemId: order.itemId,
        batchId: batch.id,
        unitId: order.outputUnitId,
        warehouseId: warehouse.id,
        zoneId: zone.id,
        quantity: dto.quantity,
      });
      await repo.createMovement({
        movementNumber: `PO-${output.id}`,
        movementType: 'production_output',
        itemId: order.itemId,
        batchId: batch.id,
        unitId: order.outputUnitId,
        quantity: dto.quantity,
        fromWarehouseId: null,
        fromZoneId: null,
        toWarehouseId: warehouse.id,
        toZoneId: zone.id,
        sourceType: 'production_order',
        sourceId: String(order.id),
        idempotencyKey: null,
        actorId,
        reason: null,
      });
      order.actualQuantity = format4(alreadyProduced + quantity);
      if (alreadyProduced + quantity === planned) {
        order.status = 'completed';
        order.completedAt = new Date();
      }
      await repo.saveOrder(order);
    });
    return this.getOrder(id);
  }
}
