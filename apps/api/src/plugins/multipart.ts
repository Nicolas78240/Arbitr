import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';

export async function registerMultipart(app: FastifyInstance): Promise<void> {
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
    },
  });
}
