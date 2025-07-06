import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    message: message,
    // In production, you might want to hide the stack trace
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}; 