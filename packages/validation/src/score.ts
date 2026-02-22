import { z } from 'zod';

const scoreEntrySchema = z.object({
  criterionId: z.string().cuid(),
  value: z.number().int().min(0).max(5).nullable(),
});

export const upsertScoresSchema = z.object({
  scores: z.array(scoreEntrySchema).min(1),
  comment: z.string().max(2000).optional(),
});

export type UpsertScoresInput = z.infer<typeof upsertScoresSchema>;
