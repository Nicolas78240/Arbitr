import { FastifyInstance } from 'fastify';
import { registerHealthRoutes } from './health.js';
import { registerAuthRoutes } from './auth.js';
import { registerAuth } from '../middleware/auth.js';
import { registerSessionRoutes } from './sessions.js';
import { registerCriteriaRoutes } from './criteria.js';
import { registerEvaluatorRoutes } from './evaluators.js';
import { registerTeamRoutes } from './teams.js';
import { registerFieldRoutes } from './fields.js';
import { registerQuadrantRoutes } from './quadrants.js';
import { registerResultRoutes } from './results.js';
import { registerProjectRoutes } from './projects.js';
import { registerScoreRoutes } from './scores.js';
import { registerUploadRoutes } from './upload.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(registerAuth);
  await app.register(registerHealthRoutes);
  await app.register(registerAuthRoutes);
  await app.register(registerSessionRoutes);
  await app.register(registerCriteriaRoutes);
  await app.register(registerEvaluatorRoutes);
  await app.register(registerTeamRoutes);
  await app.register(registerFieldRoutes);
  await app.register(registerQuadrantRoutes);
  await app.register(registerResultRoutes);
  await app.register(registerProjectRoutes);
  await app.register(registerScoreRoutes);
  await app.register(registerUploadRoutes);
}
