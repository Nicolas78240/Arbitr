import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'));

import { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    let dbStatus: 'ok' | 'error' = 'error';

    try {
      await app.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'ok';
    } catch {
      // DB unreachable
    }

    const status = dbStatus === 'ok' ? 'ok' : 'error';
    const statusCode = status === 'ok' ? 200 : 503;

    reply.code(statusCode).send({
      status,
      db: dbStatus,
      version: pkg.version || '0.0.1',
    });
  });
}
