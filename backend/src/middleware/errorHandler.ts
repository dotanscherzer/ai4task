import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err.name === 'ValidationError') {
    res.status(400).json({ 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ 
      error: 'Unauthorized',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
    return;
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    details: isDevelopment ? {
      name: err.name,
      stack: err.stack,
      path: req.path,
      method: req.method,
    } : undefined,
  });
};

