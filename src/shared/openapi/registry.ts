import { extendZodWithOpenApi, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const openApiRegistry = new OpenAPIRegistry();

export const bearerAuth = openApiRegistry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

const errorSchema = openApiRegistry.register(
  'ErrorResponse',
  z.object({
    success: z.literal(false),
    code: z.string(),
    message: z.string(),
    errors: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
  }),
);

export function errorResponse(description: string) {
  return { description, content: { 'application/json': { schema: errorSchema } } };
}

export function successResponse(description: string, data: z.ZodType, example?: unknown) {
  return {
    description,
    content: {
      'application/json': {
        schema: z.object({ success: z.literal(true), message: z.string(), data }),
        ...(example === undefined
          ? {}
          : { example: { success: true, message: description, data: example } }),
      },
    },
  };
}

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export function jsonBody(schema: z.ZodType, example?: unknown) {
  return {
    required: true,
    content: { 'application/json': { schema, ...(example === undefined ? {} : { example }) } },
  };
}

export const commonErrors = {
  401: errorResponse('Missing, invalid or expired access token'),
  403: errorResponse('Authenticated but not permitted'),
};
