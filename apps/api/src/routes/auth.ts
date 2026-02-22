import { FastifyInstance } from 'fastify';
import {
  authRegistry,
  AdminCodeStrategy,
  EvaluatorCodeStrategy,
  TeamCodeStrategy,
  AuthError,
} from '../auth/index.js';
import { generateTokens, rotateRefreshToken, revokeRefreshToken } from '../services/token.js';

// Register strategies on first load
if (!authRegistry.has('admin-code')) {
  authRegistry.register(new AdminCodeStrategy());
  authRegistry.register(new EvaluatorCodeStrategy());
  authRegistry.register(new TeamCodeStrategy());
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const rateLimitConfig = {
    max: 10,
    timeWindow: '15 minutes',
  };

  // POST /auth/admin
  app.post<{
    Body: { sessionId: string; adminCode: string };
  }>('/auth/admin', {
    config: { rateLimit: rateLimitConfig },
  }, async (request, reply) => {
    try {
      const strategy = authRegistry.resolve('admin-code');
      const payload = await strategy.authenticate(request.body, {
        prisma: app.prisma,
      });
      const tokens = await generateTokens(app, payload);
      return reply.code(200).send(tokens);
    } catch (err) {
      return handleAuthError(err, reply);
    }
  });

  // POST /auth/evaluator
  app.post<{
    Body: { sessionId: string; evaluatorCode: string };
  }>('/auth/evaluator', {
    config: { rateLimit: rateLimitConfig },
  }, async (request, reply) => {
    try {
      const strategy = authRegistry.resolve('evaluator-code');
      const payload = await strategy.authenticate(request.body, {
        prisma: app.prisma,
      });
      const tokens = await generateTokens(app, payload);
      return reply.code(200).send(tokens);
    } catch (err) {
      return handleAuthError(err, reply);
    }
  });

  // POST /auth/team
  app.post<{
    Body: { sessionId: string; teamCode: string };
  }>('/auth/team', {
    config: { rateLimit: rateLimitConfig },
  }, async (request, reply) => {
    try {
      const strategy = authRegistry.resolve('team-code');
      const payload = await strategy.authenticate(request.body, {
        prisma: app.prisma,
      });
      const tokens = await generateTokens(app, payload);
      return reply.code(200).send(tokens);
    } catch (err) {
      return handleAuthError(err, reply);
    }
  });

  // POST /auth/refresh
  app.post<{
    Body: { refreshToken: string };
  }>('/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body;
    if (!refreshToken) {
      return reply.code(400).send({
        error: 'MISSING_TOKEN',
        message: 'Refresh token is required',
        statusCode: 400,
      });
    }

    const tokens = await rotateRefreshToken(app, refreshToken);
    if (!tokens) {
      return reply.code(401).send({
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
        statusCode: 401,
      });
    }

    return reply.code(200).send(tokens);
  });

  // POST /auth/logout
  app.post<{
    Body: { refreshToken: string };
  }>('/auth/logout', async (request, reply) => {
    const { refreshToken } = request.body;
    if (refreshToken) {
      await revokeRefreshToken(app, refreshToken);
    }
    return reply.code(200).send({ message: 'Logged out' });
  });
}

function handleAuthError(err: unknown, reply: import('fastify').FastifyReply) {
  if (err instanceof AuthError) {
    return reply.code(err.statusCode).send({
      error: err.code,
      message: err.message,
      statusCode: err.statusCode,
    });
  }
  throw err;
}
