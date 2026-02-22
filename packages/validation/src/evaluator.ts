import { z } from 'zod';

export const createEvaluatorSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(3).max(50),
});

export const updateEvaluatorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export type CreateEvaluatorInput = z.infer<typeof createEvaluatorSchema>;
export type UpdateEvaluatorInput = z.infer<typeof updateEvaluatorSchema>;
