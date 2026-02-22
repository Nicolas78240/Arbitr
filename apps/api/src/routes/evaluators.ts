import { FastifyInstance } from 'fastify';
import { generateCode, hashCode } from '../services/code-gen.js';

export async function registerEvaluatorRoutes(app: FastifyInstance): Promise<void> {
  const adminPreValidation = [app.authenticate, app.requireRole('ADMIN')];

  // GET /sessions/:sessionId/evaluators — list evaluators (WITHOUT code)
  app.get<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId/evaluators', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId } = request.params;

    const session = await app.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    const evaluators = await app.prisma.evaluator.findMany({
      where: { sessionId },
      select: {
        id: true,
        sessionId: true,
        name: true,
      },
    });

    return reply.send(evaluators);
  });

  // POST /sessions/:sessionId/evaluators — create evaluator
  app.post<{
    Params: { sessionId: string };
    Body: { name: string; code?: string };
  }>('/sessions/:sessionId/evaluators', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId } = request.params;
    const { name, code } = request.body;

    if (!name) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'name is required',
        statusCode: 400,
      });
    }

    const session = await app.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    const plainCode = code || generateCode();
    const hashedCode = await hashCode(plainCode);

    const evaluator = await app.prisma.evaluator.create({
      data: {
        sessionId,
        name,
        code: hashedCode,
      },
    });

    // Return plain code only in create response
    return reply.code(201).send({
      id: evaluator.id,
      sessionId: evaluator.sessionId,
      name: evaluator.name,
      code: plainCode,
    });
  });

  // PATCH /sessions/:sessionId/evaluators/:id — update evaluator (name only)
  app.patch<{
    Params: { sessionId: string; id: string };
    Body: { name: string };
  }>('/sessions/:sessionId/evaluators/:id', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId, id } = request.params;
    const { name } = request.body;

    if (!name) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'name is required',
        statusCode: 400,
      });
    }

    const existing = await app.prisma.evaluator.findFirst({
      where: { id, sessionId },
    });
    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Evaluator not found',
        statusCode: 404,
      });
    }

    const evaluator = await app.prisma.evaluator.update({
      where: { id },
      data: { name },
      select: {
        id: true,
        sessionId: true,
        name: true,
      },
    });

    return reply.send(evaluator);
  });

  // DELETE /sessions/:sessionId/evaluators/:id — delete evaluator (cascade scores)
  app.delete<{
    Params: { sessionId: string; id: string };
  }>('/sessions/:sessionId/evaluators/:id', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId, id } = request.params;

    const existing = await app.prisma.evaluator.findFirst({
      where: { id, sessionId },
    });
    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Evaluator not found',
        statusCode: 404,
      });
    }

    // Delete scores first, then evaluator
    await app.prisma.$transaction([
      app.prisma.score.deleteMany({ where: { evaluatorId: id } }),
      app.prisma.evaluator.delete({ where: { id } }),
    ]);

    return reply.code(204).send();
  });
}
