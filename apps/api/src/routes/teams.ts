import { FastifyInstance } from 'fastify';
import { generateCode, hashCode } from '../services/code-gen.js';

export async function registerTeamRoutes(app: FastifyInstance): Promise<void> {
  const adminPreValidation = [app.authenticate, app.requireRole('ADMIN')];

  // GET /sessions/:sessionId/teams — list teams (WITHOUT code, WITH project)
  app.get<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId/teams', {
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

    const teams = await app.prisma.team.findMany({
      where: { sessionId },
      select: {
        id: true,
        sessionId: true,
        name: true,
        project: true,
      },
    });

    return reply.send(teams);
  });

  // POST /sessions/:sessionId/teams — create team
  app.post<{
    Params: { sessionId: string };
    Body: { name: string; code?: string };
  }>('/sessions/:sessionId/teams', {
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

    const team = await app.prisma.team.create({
      data: {
        sessionId,
        name,
        code: hashedCode,
      },
    });

    // Return plain code only in create response
    return reply.code(201).send({
      id: team.id,
      sessionId: team.sessionId,
      name: team.name,
      code: plainCode,
    });
  });

  // PATCH /sessions/:sessionId/teams/:id — update team (name only)
  app.patch<{
    Params: { sessionId: string; id: string };
    Body: { name: string };
  }>('/sessions/:sessionId/teams/:id', {
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

    const existing = await app.prisma.team.findFirst({
      where: { id, sessionId },
    });
    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Team not found',
        statusCode: 404,
      });
    }

    const team = await app.prisma.team.update({
      where: { id },
      data: { name },
      select: {
        id: true,
        sessionId: true,
        name: true,
      },
    });

    return reply.send(team);
  });

  // DELETE /sessions/:sessionId/teams/:id — delete team (cascade project + scores)
  app.delete<{
    Params: { sessionId: string; id: string };
  }>('/sessions/:sessionId/teams/:id', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId, id } = request.params;

    const existing = await app.prisma.team.findFirst({
      where: { id, sessionId },
      include: { project: true },
    });
    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Team not found',
        statusCode: 404,
      });
    }

    // Cascade: delete scores -> project -> team
    await app.prisma.$transaction(async (tx) => {
      if (existing.project) {
        await tx.score.deleteMany({ where: { projectId: existing.project.id } });
        await tx.project.delete({ where: { id: existing.project.id } });
      }
      await tx.team.delete({ where: { id } });
    });

    return reply.code(204).send();
  });
}
