import { z } from 'zod';
import type {
  BillOfMaterialLine,
  BillOfMaterials,
  ProductionMaterialIssue,
  ProductionOrder,
  ProductionOrderOutput,
} from '../entities/production.entity';
import type {
  createBomSchema,
  createProductionOrderSchema,
  issueMaterialsSchema,
  listBomsQuerySchema,
  listProductionOrdersQuerySchema,
  recordOutputSchema,
} from '../validators/production.validator';

export type CreateBomDto = z.infer<typeof createBomSchema>;
export type CreateProductionOrderDto = z.infer<typeof createProductionOrderSchema>;
export type IssueMaterialsDto = z.infer<typeof issueMaterialsSchema>;
export type RecordOutputDto = z.infer<typeof recordOutputSchema>;
export type ListBomsQueryDto = z.infer<typeof listBomsQuerySchema>;
export type ListProductionOrdersQueryDto = z.infer<typeof listProductionOrdersQuerySchema>;

export interface BomResponseDto {
  id: number;
  itemId: number;
  revision: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
  lines: Array<
    Pick<
      BillOfMaterialLine,
      'id' | 'lineNumber' | 'materialItemId' | 'unitId' | 'quantity' | 'scrapPercent'
    >
  >;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionOrderResponseDto {
  id: number;
  productionOrderNumber: string;
  billOfMaterialsId: number;
  itemId: number;
  plannedQuantity: string;
  actualQuantity: string;
  outputUnitId: number;
  plannedStartAt: string;
  actualStartAt: string | null;
  completedAt: string | null;
  startedById: number | null;
  status: string;
  notes: string | null;
  issues: Array<
    Pick<
      ProductionMaterialIssue,
      'id' | 'materialItemId' | 'batchId' | 'unitId' | 'issuedQuantity' | 'returnedQuantity'
    >
  >;
  outputs: Array<Pick<ProductionOrderOutput, 'id' | 'batchId' | 'unitId' | 'quantity'>>;
  createdAt: string;
  updatedAt: string;
}

export function toBomResponse(bom: BillOfMaterials, lines: BillOfMaterialLine[]): BomResponseDto {
  return {
    id: bom.id,
    itemId: bom.itemId,
    revision: bom.revision,
    effectiveFrom: bom.effectiveFrom,
    effectiveTo: bom.effectiveTo,
    status: bom.status,
    lines: lines.map((line) => ({
      id: line.id,
      lineNumber: line.lineNumber,
      materialItemId: line.materialItemId,
      unitId: line.unitId,
      quantity: line.quantity,
      scrapPercent: line.scrapPercent,
    })),
    createdAt: bom.createdAt.toISOString(),
    updatedAt: bom.updatedAt.toISOString(),
  };
}

export function toProductionOrderResponse(
  order: ProductionOrder,
  issues: ProductionMaterialIssue[],
  outputs: ProductionOrderOutput[],
): ProductionOrderResponseDto {
  return {
    id: order.id,
    productionOrderNumber: order.productionOrderNumber,
    billOfMaterialsId: order.billOfMaterialsId,
    itemId: order.itemId,
    plannedQuantity: order.plannedQuantity,
    actualQuantity: order.actualQuantity,
    outputUnitId: order.outputUnitId,
    plannedStartAt: order.plannedStartAt.toISOString(),
    actualStartAt: order.actualStartAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    startedById: order.startedById,
    status: order.status,
    notes: order.notes,
    issues: issues.map((issue) => ({
      id: issue.id,
      materialItemId: issue.materialItemId,
      batchId: issue.batchId,
      unitId: issue.unitId,
      issuedQuantity: issue.issuedQuantity,
      returnedQuantity: issue.returnedQuantity,
    })),
    outputs: outputs.map((output) => ({
      id: output.id,
      batchId: output.batchId,
      unitId: output.unitId,
      quantity: output.quantity,
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
