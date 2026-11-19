import { z } from 'zod';
import { paginationQueryShape } from '../../../shared/helpers/pagination';

const id = z.coerce.number().int().min(1).max(4_294_967_295);
const signedDecimal = z.string().regex(/^-?\d{1,13}(\.\d{1,6})?$/);
const nullableDecimal = signedDecimal.nullable().optional();
function scaled6(value: string): bigint {
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const result = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
  return negative ? -result : result;
}

export const qcIdParamsSchema = z.object({ id });
export const listTestDefinitionsQuerySchema = z.object({
  ...paginationQueryShape,
  itemId: id.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export const createTestDefinitionSchema = z
  .strictObject({
    code: z.string().trim().min(1).max(50),
    name: z.string().trim().min(1).max(150),
    itemId: id.nullable().optional(),
    measurementUnitId: id.nullable().optional(),
    minimumValue: nullableDecimal,
    maximumValue: nullableDecimal,
    isRequired: z.boolean().default(true),
  })
  .refine(
    (value) =>
      value.minimumValue === undefined ||
      value.minimumValue === null ||
      value.maximumValue === undefined ||
      value.maximumValue === null ||
      scaled6(value.minimumValue) <= scaled6(value.maximumValue),
    {
      path: ['maximumValue'],
      message: 'Maximum value must be greater than or equal to minimum value',
    },
  )
  .refine(
    (value) =>
      (value.minimumValue == null && value.maximumValue == null) || value.measurementUnitId != null,
    {
      path: ['measurementUnitId'],
      message: 'Numeric test definitions require a measurement unit',
    },
  );

export const listInspectionsQuerySchema = z.object({
  ...paginationQueryShape,
  batchId: id.optional(),
  status: z.string().trim().min(1).max(20).optional(),
});

const inspectionResultSchema = z.strictObject({
  testDefinitionId: id,
  numericValue: signedDecimal.optional(),
  textValue: z.string().trim().min(1).max(255).optional(),
  passed: z.boolean().optional(),
  notes: z.string().max(16_000).nullable().optional(),
});
export const createInspectionSchema = z.strictObject({
  inspectionNumber: z.string().trim().min(1).max(50),
  batchId: id,
  results: z.array(inspectionResultSchema).min(1).max(100),
});
