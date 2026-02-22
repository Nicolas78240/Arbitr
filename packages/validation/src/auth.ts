import { z } from 'zod';

export const adminLoginSchema = z.object({
  adminCode: z.string().min(1),
});

export const evaluatorLoginSchema = z.object({
  sessionId: z.string().cuid(),
  evaluatorCode: z.string().min(1),
});

export const teamLoginSchema = z.object({
  sessionId: z.string().cuid(),
  teamCode: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
