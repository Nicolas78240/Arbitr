import { z } from 'zod';

const axisEnum = z.enum(['X', 'Y']);

export const createCriterionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  axis: axisEnum,
  min: z.number().int().min(0).default(0),
  max: z.number().int().min(1).max(100).default(5),
  weight: z.number().int().min(1).max(100),
  order: z.number().int().min(0).default(0),
});

export const updateCriterionSchema = createCriterionSchema.partial();

export type CreateCriterionInput = z.infer<typeof createCriterionSchema>;
export type UpdateCriterionInput = z.infer<typeof updateCriterionSchema>;
