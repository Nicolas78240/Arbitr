import { z } from 'zod';

const positionEnum = z.enum(['top-right', 'top-left', 'bottom-right', 'bottom-left']);

export const createQuadrantSchema = z.object({
  position: positionEnum,
  label: z.string().min(1).max(100),
  icon: z.string().max(10),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const updateQuadrantSchema = createQuadrantSchema.partial().omit({ position: true });

export type CreateQuadrantInput = z.infer<typeof createQuadrantSchema>;
export type UpdateQuadrantInput = z.infer<typeof updateQuadrantSchema>;
