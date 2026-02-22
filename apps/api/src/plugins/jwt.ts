import { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

export async function registerJwt(app: FastifyInstance): Promise<void> {
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    sign: {
      expiresIn: '15m',
    },
  });
}
