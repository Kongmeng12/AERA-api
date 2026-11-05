export interface FieldError {
  field: string;
  message: string;
}

/** An error whose status, code and message are safe to return to API clients. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly errors?: FieldError[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(code: string, message: string) {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(code: string, message: string) {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(409, code, message);
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string, errors: FieldError[]) {
    super(422, code, message, errors);
  }
}
