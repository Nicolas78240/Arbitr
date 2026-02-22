import { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

export async function registerStatic(app: FastifyInstance): Promise<void> {
  // Ensure uploads directory exists before registering
  await mkdir(UPLOADS_DIR, { recursive: true });

  await app.register(fastifyStatic, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  });
}
