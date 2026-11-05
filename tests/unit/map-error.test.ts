import { QueryFailedError } from 'typeorm';
import { ConflictError } from '../../src/core/exceptions/app-error';
import { mapError } from '../../src/shared/helpers/map-error';

function queryError(code: string): QueryFailedError {
  const driverError = Object.assign(new Error('secret SQL detail'), { code });
  return new QueryFailedError('SELECT secret', ['param'], driverError);
}

describe('mapError', () => {
  it('passes application errors through', () => {
    const error = new ConflictError('X', 'y');
    expect(mapError(error)).toBe(error);
  });

  it('maps duplicate-key errors to 409 without SQL details', () => {
    const mapped = mapError(queryError('ER_DUP_ENTRY'));
    expect(mapped.statusCode).toBe(409);
    expect(mapped.message).not.toMatch(/secret/);
  });

  it('hides unknown database errors behind a generic 500', () => {
    const mapped = mapError(queryError('ER_LOCK_DEADLOCK'));
    expect(mapped.statusCode).toBe(500);
    expect(mapped.message).not.toMatch(/secret/);
  });

  it('hides unknown errors behind a generic 500', () => {
    expect(mapError(new Error('secret')).message).not.toMatch(/secret/);
    expect(mapError('a string').statusCode).toBe(500);
  });

  it('maps body-parser errors', () => {
    expect(mapError({ type: 'entity.parse.failed' }).statusCode).toBe(400);
    expect(mapError({ type: 'entity.too.large' }).statusCode).toBe(413);
  });
});
