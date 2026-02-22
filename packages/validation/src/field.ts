import { z } from 'zod';

const fieldTypeEnum = z.enum(['TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'EMAIL', 'URL']);

export const createFieldSchema = z.object({
  label: z.string().min(1).max(200),
  placeholder: z.string().max(500).optional(),
  type: fieldTypeEnum,
  required: z.boolean().default(false),
  options: z.array(z.string()).default([]),
  order: z.number().int().min(0).default(0),
});

export const updateFieldSchema = createFieldSchema.partial();

export type CreateFieldInput = z.infer<typeof createFieldSchema>;
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;
