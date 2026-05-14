import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
  console.error(err);
  const status = (err as any)?.status ?? 500;
  const message = err instanceof Error ? err.message : 'Something went wrong!';
  res.status(status).json({ message });
};