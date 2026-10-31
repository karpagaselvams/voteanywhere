import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

// Parse body, params, or query at the edge. A service receives typed,
// validated input and never re-parses raw request data.
export function validate(schema: ZodType, source: 'body' | 'params' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    (req as unknown as Record<string, unknown>)[source] = parsed.data;
    next();
  };
}
