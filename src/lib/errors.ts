export class AppError extends Error {
  public status: number;
  constructor(message?: string, status = 500) {
    super(message ?? "Internal Error");
    this.status = status;
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message?: string) {
    super(message ?? "Bad Request", 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message?: string) {
    super(message ?? "Not Found", 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message?: string) {
    super(message ?? "Unauthorized", 401);
  }
}

export class RateLimitError extends AppError {
  constructor(message?: string) {
    super(message ?? "Too Many Requests", 429);
  }
}
