import type { RequestHandler } from 'express';
import type { ZodError, ZodType } from 'zod';
import { ValidationError, type FieldError } from '../../core/exceptions/app-error';
import { ERROR_CODES } from '../constants/error-codes';

type RequestPart = 'body' | 'query' | 'params';
type RequestSchemas = Partial<Record<RequestPart, ZodType>>;

function toFieldErrors(error: ZodError, part: RequestPart): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : part,
    message: issue.message,
  }));
}

/** Validates untrusted input and exposes the parsed values on `req.validated`. */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const errors: FieldError[] = [];
    req.validated = {};
    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (schema) {
        const result = schema.safeParse(req[part]);
        if (result.success) {
          req.validated[part] = result.data;
        } else {
          errors.push(...toFieldErrors(result.error, part));
        }
      }
    }
    if (errors.length > 0) {
      next(new ValidationError(ERROR_CODES.VALIDATION_ERROR, 'Validation failed', errors));
      return;
    }
    next();
  };
}
