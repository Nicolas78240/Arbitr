import { FastifyInstance } from 'fastify';
import { registerCors } from './cors.js';
import { registerHelmet } from './helmet.js';
import { registerRateLimit } from './rate-limit.js';
import { registerJwt } from './jwt.js';
import { registerPrisma } from './prisma.js';
import { registerMultipart } from './multipart.js';
import { registerStatic } from './static.js';
import sensible from '@fastify/sensible';

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  await app.register(sensible);
  await registerCors(app);
  await registerHelmet(app);
  await registerRateLimit(app);
  await registerJwt(app);
  await registerPrisma(app);
  await registerMultipart(app);
  await registerStatic(app);
}
