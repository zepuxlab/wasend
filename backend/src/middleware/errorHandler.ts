import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  const error: ApiError = {
    error: true,
    message: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    details: err.details,
  };

  // Определение статус кода
  let statusCode = 500;
  if (err.statusCode) {
    statusCode = err.statusCode;
  } else if (err.code === 'VALIDATION_ERROR') {
    statusCode = 400;
  } else if (err.code === 'NOT_FOUND') {
    statusCode = 404;
  } else if (err.code === 'CAMPAIGN_INVALID_STATUS') {
    statusCode = 400;
  } else if (err.code === 'REPLY_WINDOW_EXPIRED') {
    statusCode = 400;
  }

  res.status(statusCode).json(error);
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: true,
    message: 'Route not found',
    code: 'NOT_FOUND',
  });
}

