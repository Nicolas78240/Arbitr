import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function authMiddleware(app: FastifyInstance): Promise<void> {
  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or expired token', statusCode: 401 });
    }
  });

  app.decorate('requireRole', function (...roles: string[]) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      await app.authenticate(request, reply);
      if (reply.sent) return;
      const user = request.user as { role?: string };
      if (!user?.role || !roles.includes(user.role)) {
        return reply.code(403).send({ error: 'FORBIDDEN', message: 'Insufficient permissions', statusCode: 403 });
      }
    };
  });
}

export const registerAuth = fp(authMiddleware, {
  name: 'auth-middleware',
});
