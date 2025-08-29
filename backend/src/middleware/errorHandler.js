// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error('Error Handler:', err);
  
  // Default to 500 if status code not set
  const statusCode = err.statusCode || 500;
  
  const response = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  // Include validation errors if they exist
  if (err.errors) {
    response.errors = err.errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

// Export custom error classes for use in controllers
class CustomError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
  }
}

class NotFoundError extends CustomError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class BadRequestError extends CustomError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

class ForbiddenError extends CustomError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

class UnauthorizedError extends CustomError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ValidationError extends CustomError {
  constructor(message = 'Validation error', errors = []) {
    super(message, 422);
    this.errors = errors;
  }
}

module.exports = {
  errorHandler,
  CustomError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError
};
