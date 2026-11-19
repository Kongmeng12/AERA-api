import { ConflictError, NotFoundError, ValidationError } from '../../../core/exceptions/app-error';
import { ERROR_CODES } from '../../../shared/constants/error-codes';
import { formatDecimal4, parseDecimal4 } from '../../../shared/helpers/decimal';
import { toPaginatedResult } from '../../../shared/helpers/pagination';
import {
  toInspectionResponse,
  toTestDefinitionResponse,
  type CreateInspectionDto,
  type CreateTestDefinitionDto,
  type ListInspectionsQueryDto,
  type ListTestDefinitionsQueryDto,
} from '../dto/quality-control.dto';
import type { QualityControlRepository } from '../repositories/quality-control.repository';

function error(field: string, message: string): ValidationError {
  return new ValidationError(ERROR_CODES.VALIDATION_ERROR, 'Validation failed', [
    { field, message },
  ]);
}
function scaled6(value: string): bigint {
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const scaled = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
  return negative ? -scaled : scaled;
}

export class QualityControlService {
  constructor(private readonly repository: QualityControlRepository) {}

  async listTestDefinitions(query: ListTestDefinitionsQueryDto) {
    const [definitions, total] = await this.repository.listDefinitions(query);
    return toPaginatedResult(
      definitions.map(toTestDefinitionResponse),
      total,
      query.page,
      query.limit,
    );
  }

  async createTestDefinition(dto: CreateTestDefinitionDto) {
    if (
      dto.itemId !== undefined &&
      dto.itemId !== null &&
      !(await this.repository.findItem(dto.itemId))
    ) {
      throw error('itemId', 'Item does not exist or is inactive');
    }
    if (
      dto.measurementUnitId !== undefined &&
      dto.measurementUnitId !== null &&
      !(await this.repository.findUnit(dto.measurementUnitId))
    ) {
      throw error('measurementUnitId', 'Measurement unit does not exist');
    }
    const definition = await this.repository.createDefinition({
      code: dto.code,
      name: dto.name,
      itemId: dto.itemId ?? null,
      measurementUnitId: dto.measurementUnitId ?? null,
      minimumValue: dto.minimumValue ?? null,
      maximumValue: dto.maximumValue ?? null,
      isRequired: dto.isRequired,
      isActive: true,
    });
    return toTestDefinitionResponse(definition);
  }

  async listInspections(query: ListInspectionsQueryDto) {
    const [inspections, total] = await this.repository.listInspections(query);
    const results = await this.repository.findResults(
      inspections.map((inspection) => inspection.id),
    );
    return toPaginatedResult(
      inspections.map((inspection) =>
        toInspectionResponse(
          inspection,
          results.filter((result) => result.inspectionId === inspection.id),
        ),
      ),
      total,
      query.page,
      query.limit,
    );
  }

  async getInspection(id: number) {
    const inspection = await this.repository.findInspection(id);
    if (!inspection)
      throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'QC inspection not found');
    return toInspectionResponse(inspection, await this.repository.findResults([id]));
  }

  async createInspection(dto: CreateInspectionDto, inspectorId: number) {
    const result = await this.repository.transaction(async (repo) => {
      const batch = await repo.findBatchForUpdate(dto.batchId);
      if (!batch || batch.status !== 'active')
        throw error('batchId', 'Active stock batch does not exist');
      const balances = await repo.findQcHoldBalances(batch.id);
      if (
        balances.length === 0 ||
        balances.every((balance) => parseDecimal4(balance.quantityOnHand) === 0n)
      ) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'The batch has no QC-hold stock to inspect',
        );
      }
      if (await repo.findUnreleasedPassingInspection(batch.id)) {
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'A passing inspection for this batch is awaiting explicit release',
        );
      }
      const definitions = await repo.findActiveDefinitions(batch.itemId);
      if (definitions.length === 0)
        throw error('results', 'No active QC test definitions are configured for this item');
      const ids = dto.results.map((entry) => entry.testDefinitionId);
      if (new Set(ids).size !== ids.length)
        throw error('results', 'Each QC test definition may be reported only once');
      const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
      for (const definition of definitions.filter((entry) => entry.isRequired)) {
        if (!ids.includes(definition.id))
          throw error('results', `Required QC test ${definition.code} is missing`);
      }
      const storedResults = [];
      let allPassed = true;
      for (const [index, input] of dto.results.entries()) {
        const definition = definitionsById.get(input.testDefinitionId);
        if (!definition)
          throw error(
            `results.${index}.testDefinitionId`,
            'Test is inactive or is not configured for this item',
          );
        const numeric = definition.minimumValue !== null || definition.maximumValue !== null;
        let passed: boolean;
        if (numeric) {
          if (
            input.numericValue === undefined ||
            input.textValue !== undefined ||
            input.passed !== undefined
          ) {
            throw error(
              `results.${index}`,
              'Numeric tests require only a numeric value; the server evaluates configured limits',
            );
          }
          const value = scaled6(input.numericValue);
          passed =
            (definition.minimumValue === null || value >= scaled6(definition.minimumValue)) &&
            (definition.maximumValue === null || value <= scaled6(definition.maximumValue));
        } else {
          if (
            input.textValue === undefined ||
            input.passed === undefined ||
            input.numericValue !== undefined
          ) {
            throw error(
              `results.${index}`,
              'Qualitative tests require an inspector-provided text result and pass/fail decision',
            );
          }
          passed = input.passed;
        }
        allPassed &&= passed;
        storedResults.push({
          testDefinitionId: definition.id,
          numericValue: input.numericValue ?? null,
          textValue: input.textValue ?? null,
          passed,
          notes: input.notes ?? null,
        });
      }
      const failedQuantity = allPassed
        ? 0n
        : balances.reduce((sum, balance) => sum + parseDecimal4(balance.quantityOnHand), 0n);
      const inspection = await repo.createInspection({
        inspectionNumber: dto.inspectionNumber,
        batchId: batch.id,
        inspectedById: inspectorId,
        inspectedAt: new Date(),
        status: allPassed ? 'passed' : 'failed',
        rejectedQuantity: formatDecimal4(failedQuantity),
        holdReason: allPassed ? null : 'One or more QC test results failed',
        releasedById: null,
        releasedAt: null,
      });
      const results = await repo.createResults(
        storedResults.map((entry) => ({
          inspectionId: inspection.id,
          ...entry,
        })),
      );
      if (!allPassed && batch.qcStatus !== 'passed') {
        batch.qcStatus = 'failed';
        await repo.saveBatch(batch);
      }
      return { inspection, results };
    });
    return toInspectionResponse(result.inspection, result.results);
  }

  async releaseInspection(id: number, releaserId: number) {
    await this.repository.transaction(async (repo) => {
      const inspection = await repo.findInspectionForUpdate(id);
      if (!inspection)
        throw new NotFoundError(ERROR_CODES.MASTER_DATA_NOT_FOUND, 'QC inspection not found');
      if (inspection.status !== 'passed')
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'Only inspections with passing results can release stock',
        );
      if (inspection.releasedAt !== null)
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'QC inspection stock was already released',
        );
      const batch = await repo.findBatchForUpdate(inspection.batchId);
      if (!batch || batch.status !== 'active')
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'The inspected stock batch is no longer active',
        );
      const balances = await repo.findQcHoldBalances(batch.id);
      const releasable = balances.filter((balance) => parseDecimal4(balance.quantityOnHand) > 0n);
      if (releasable.length === 0)
        throw new ConflictError(
          ERROR_CODES.RESOURCE_CONFLICT,
          'The batch has no QC-hold stock to release',
        );
      for (const balance of releasable) {
        if (parseDecimal4(balance.quantityReserved) > 0n) {
          throw new ConflictError(
            ERROR_CODES.RESOURCE_CONFLICT,
            'QC-hold stock with reserved quantity cannot be released',
          );
        }
        const quantity = formatDecimal4(parseDecimal4(balance.quantityOnHand));
        await repo.addAvailableBalance({
          itemId: balance.itemId,
          batchId: balance.batchId,
          unitId: balance.unitId,
          warehouseId: balance.warehouseId,
          zoneId: balance.zoneId,
          quantity,
        });
        balance.quantityOnHand = '0.0000';
        await repo.saveBalance(balance);
        await repo.createMovement({
          movementNumber: `QR-${inspection.id}-${balance.id}`,
          movementType: 'qc_release',
          itemId: balance.itemId,
          batchId: balance.batchId,
          unitId: balance.unitId,
          quantity,
          fromWarehouseId: balance.warehouseId,
          fromZoneId: balance.zoneId,
          toWarehouseId: balance.warehouseId,
          toZoneId: balance.zoneId,
          sourceType: 'qc_inspection',
          sourceId: String(inspection.id),
          idempotencyKey: null,
          actorId: releaserId,
          reason: null,
        });
      }
      if (batch.qcStatus !== 'passed') {
        batch.qcStatus = 'passed';
        await repo.saveBatch(batch);
      }
      inspection.releasedAt = new Date();
      inspection.releasedById = releaserId;
      await repo.saveInspection(inspection);
    });
    return this.getInspection(id);
  }
}
