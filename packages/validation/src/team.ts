import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(3).max(50),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
