import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(300),
  formData: z.record(z.unknown()),
  fileUrl: z.string().min(1).max(2000).optional(),
  fileName: z.string().max(500).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  formData: z.record(z.unknown()).optional(),
  fileUrl: z.string().min(1).max(2000).nullable().optional(),
  fileName: z.string().max(500).nullable().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
