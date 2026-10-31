import { z } from 'zod';

export const submitRequestSchema = z.object({
  electionId: z.string().uuid(),
  pollingCentreId: z.string().uuid(),
  reason: z.string().max(1000).optional(),
});

export const rejectSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export const queueQuerySchema = z.object({
  status: z
    .enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'USED', 'EXPIRED'])
    .optional(),
});

export const requestIdParamsSchema = z.object({
  id: z.string().uuid(),
});
