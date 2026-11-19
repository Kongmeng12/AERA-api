import { z } from 'zod';
import {
  bearerAuth,
  commonErrors,
  errorResponse,
  jsonBody,
  openApiRegistry,
  paginationMetaSchema,
  successResponse,
} from '../../../shared/openapi/registry';
import {
  createInspectionSchema,
  createTestDefinitionSchema,
  listInspectionsQuerySchema,
  listTestDefinitionsQuerySchema,
  qcIdParamsSchema,
} from '../validators/quality-control.validator';

const security = [{ [bearerAuth.name]: [] }];
const testDefinitionSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  itemId: z.number().nullable(),
  measurementUnitId: z.number().nullable(),
  minimumValue: z.string().nullable(),
  maximumValue: z.string().nullable(),
  isRequired: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const inspectionSchema = z.object({
  id: z.number(),
  inspectionNumber: z.string(),
  batchId: z.number(),
  inspectedById: z.number(),
  inspectedAt: z.string(),
  status: z.string(),
  rejectedQuantity: z.string(),
  holdReason: z.string().nullable(),
  releasedById: z.number().nullable(),
  releasedAt: z.string().nullable(),
  results: z.array(
    z.object({
      id: z.number(),
      testDefinitionId: z.number(),
      numericValue: z.string().nullable(),
      textValue: z.string().nullable(),
      passed: z.boolean(),
      notes: z.string().nullable(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/quality-control/test-definitions',
  tags: ['Quality Control'],
  security,
  summary: 'List QC test definitions',
  request: { query: listTestDefinitionsQuerySchema },
  responses: {
    200: successResponse(
      'Successfully retrieved QC test definitions',
      z.object({
        items: z.array(testDefinitionSchema),
        pagination: paginationMetaSchema,
      }),
    ),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/quality-control/test-definitions',
  tags: ['Quality Control'],
  security,
  summary: 'Create a QC test definition',
  description:
    'Numeric tests use only the configured minimum and maximum. Definitions without numeric bounds are qualitative.',
  request: { body: jsonBody(createTestDefinitionSchema) },
  responses: {
    201: successResponse('Successfully created QC test definition', testDefinitionSchema),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});
openApiRegistry.registerPath({
  method: 'get',
  path: '/quality-control/inspections',
  tags: ['Quality Control'],
  security,
  summary: 'List QC inspections',
  request: { query: listInspectionsQuerySchema },
  responses: {
    200: successResponse(
      'Successfully retrieved QC inspections',
      z.object({
        items: z.array(inspectionSchema),
        pagination: paginationMetaSchema,
      }),
    ),
    ...commonErrors,
    422: errorResponse('Validation failed'),
  },
});
openApiRegistry.registerPath({
  method: 'get',
  path: '/quality-control/inspections/{id}',
  tags: ['Quality Control'],
  security,
  summary: 'Get a QC inspection',
  request: { params: qcIdParamsSchema },
  responses: {
    200: successResponse('Successfully retrieved QC inspection', inspectionSchema),
    ...commonErrors,
    404: errorResponse('QC inspection not found'),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/quality-control/inspections',
  tags: ['Quality Control'],
  security,
  summary: 'Inspect QC-hold stock',
  description:
    'Numeric results are compared server-side with configured limits. Qualitative results require the inspector to submit a text result and pass/fail decision.',
  request: { body: jsonBody(createInspectionSchema) },
  responses: {
    201: successResponse('Successfully recorded QC inspection results', inspectionSchema),
    ...commonErrors,
    409: errorResponse('Batch has no QC-hold stock or inspection conflict'),
  },
});
openApiRegistry.registerPath({
  method: 'post',
  path: '/quality-control/inspections/{id}/release',
  tags: ['Quality Control'],
  security,
  summary: 'Explicitly release stock from QC hold',
  description:
    'Only passing, unreleased inspections may release QC-hold balances; available balances are unchanged.',
  request: { params: qcIdParamsSchema },
  responses: {
    200: successResponse('Successfully released QC-hold stock', inspectionSchema),
    ...commonErrors,
    409: errorResponse('Inspection has not passed or stock was already released'),
  },
});
