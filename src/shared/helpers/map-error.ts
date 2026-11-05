import { QueryFailedError } from 'typeorm';
import { AppError } from '../../core/exceptions/app-error';
import { ERROR_CODES } from '../constants/error-codes';

const CONFLICT_DRIVER_CODES = new Set([
  'ER_DUP_ENTRY',
  'ER_NO_REFERENCED_ROW_2',
  'ER_ROW_IS_REFERENCED_2',
]);

function hasStringProp<K extends string>(value: unknown, key: K): value is Record<K, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)[key] === 'string'
  );
}

/** Converts any thrown value into an AppError that is safe to send to clients. */
export function mapError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof QueryFailedError) {
    const driverError: unknown = error.driverError;
    if (hasStringProp(driverError, 'code') && CONFLICT_DRIVER_CODES.has(driverError.code)) {
      return new AppError(
        409,
        ERROR_CODES.RESOURCE_CONFLICT,
        'The request conflicts with existing data',
      );
    }
  }
  // Errors raised by body-parser.
  if (hasStringProp(error, 'type')) {
    if (error.type === 'entity.parse.failed') {
      return new AppError(400, ERROR_CODES.BAD_REQUEST, 'Request body contains malformed JSON');
    }
    if (error.type === 'entity.too.large') {
      return new AppError(413, ERROR_CODES.PAYLOAD_TOO_LARGE, 'Request body is too large');
    }
    if (error.type.startsWith('encoding.') || error.type.startsWith('charset.')) {
      return new AppError(400, ERROR_CODES.BAD_REQUEST, 'Unsupported request body encoding');
    }
  }
  return new AppError(500, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
}
