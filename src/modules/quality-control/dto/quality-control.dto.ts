import { z } from 'zod';
import type {
  QcInspection,
  QcInspectionResult,
  QcTestDefinition,
} from '../entities/quality-control.entity';
import type {
  createInspectionSchema,
  createTestDefinitionSchema,
  listInspectionsQuerySchema,
  listTestDefinitionsQuerySchema,
} from '../validators/quality-control.validator';

export type CreateInspectionDto = z.infer<typeof createInspectionSchema>;
export type CreateTestDefinitionDto = z.infer<typeof createTestDefinitionSchema>;
export type ListInspectionsQueryDto = z.infer<typeof listInspectionsQuerySchema>;
export type ListTestDefinitionsQueryDto = z.infer<typeof listTestDefinitionsQuerySchema>;

export function toTestDefinitionResponse(definition: QcTestDefinition) {
  return {
    id: definition.id,
    code: definition.code,
    name: definition.name,
    itemId: definition.itemId,
    measurementUnitId: definition.measurementUnitId,
    minimumValue: definition.minimumValue,
    maximumValue: definition.maximumValue,
    isRequired: definition.isRequired,
    isActive: definition.isActive,
    createdAt: definition.createdAt.toISOString(),
    updatedAt: definition.updatedAt.toISOString(),
  };
}

export function toInspectionResponse(inspection: QcInspection, results: QcInspectionResult[]) {
  return {
    id: inspection.id,
    inspectionNumber: inspection.inspectionNumber,
    batchId: inspection.batchId,
    inspectedById: inspection.inspectedById,
    inspectedAt: inspection.inspectedAt.toISOString(),
    status: inspection.status,
    rejectedQuantity: inspection.rejectedQuantity,
    holdReason: inspection.holdReason,
    releasedById: inspection.releasedById,
    releasedAt: inspection.releasedAt?.toISOString() ?? null,
    results: results.map((result) => ({
      id: result.id,
      testDefinitionId: result.testDefinitionId,
      numericValue: result.numericValue,
      textValue: result.textValue,
      passed: result.passed,
      notes: result.notes,
    })),
    createdAt: inspection.createdAt.toISOString(),
    updatedAt: inspection.updatedAt.toISOString(),
  };
}
