import { Request, Response, NextFunction } from 'express';
import { AppError } from '@shared/types';
import { logger } from '../utils/logger';

export const errorHandler = (
  _error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Error occurred:', {
    error: _error.message,
    stack: _error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // If it's our custom AppError
  if ('statusCode' in _error && 'code' in _error) {
    const appError = _error as AppError;
    return res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message
      }
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
};


