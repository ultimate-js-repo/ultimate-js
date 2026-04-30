export class UltimateError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class BadRequestError extends UltimateError {
  constructor(message = "Bad Request") { super(message, 400, "BAD_REQUEST"); }
}

export class NotFoundError extends UltimateError {
  constructor(message = "Not Found") { super(message, 404, "NOT_FOUND"); }
}

export class ForbiddenError extends UltimateError {
  constructor(message = "Forbidden") { super(message, 403, "FORBIDDEN"); }
}

export class UnauthorizedError extends UltimateError {
  constructor(message = "Unauthorized") { super(message, 401, "UNAUTHORIZED"); }
}
