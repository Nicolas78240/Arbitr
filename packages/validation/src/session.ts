import { z } from 'zod';

export const createSessionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  adminCode: z.string().min(4).max(50),
  thresholdX: z.number().min(0).max(10).default(3.5),
  thresholdY: z.number().min(0).max(10).default(3.5),
  axisLabelX: z.string().max(100).default('Valeur'),
  axisLabelY: z.string().max(100).default('Maturité'),
  labelEvaluator: z.string().max(50).default('Évaluateur'),
  labelTeam: z.string().max(50).default('Équipe'),
  labelProject: z.string().max(50).default('Projet'),
});

export const updateSessionSchema = createSessionSchema.partial().omit({ adminCode: true });

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
