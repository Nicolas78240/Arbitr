import { FastifyInstance } from 'fastify';
import { hashCode } from '../services/code-gen.js';

export async function registerSessionRoutes(app: FastifyInstance): Promise<void> {
  const adminPreValidation = [app.authenticate, app.requireRole('ADMIN')];

  // GET /sessions/public — public list of sessions (id, name, status only)
  app.get('/sessions/public', async (_request, reply) => {
    const sessions = await app.prisma.session.findMany({
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(sessions);
  });

  // GET /sessions — list all sessions with counts
  app.get('/sessions', {
    preValidation: adminPreValidation,
  }, async (_request, reply) => {
    const sessions = await app.prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            projects: true,
            evaluators: true,
            teams: true,
            criteria: true,
          },
        },
      },
    });

    const result = sessions.map(({ adminCode: _adminCode, ...session }) => session);
    return reply.send(result);
  });

  // GET /sessions/:id — get session with all relations
  app.get<{
    Params: { id: string };
  }>('/sessions/:id', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { id } = request.params;

    const session = await app.prisma.session.findUnique({
      where: { id },
      include: {
        criteria: { orderBy: { order: 'asc' } },
        evaluators: { select: { id: true, sessionId: true, name: true } },
        teams: {
          select: { id: true, sessionId: true, name: true, project: true },
        },
        fields: { orderBy: { order: 'asc' } },
        quadrants: true,
        _count: {
          select: {
            projects: true,
            evaluators: true,
            teams: true,
            criteria: true,
          },
        },
      },
    });

    if (!session) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    const { adminCode: _adminCode, ...result } = session;
    return reply.send(result);
  });

  // POST /sessions — create session
  app.post<{
    Body: {
      name: string;
      description?: string;
      adminCode: string;
      thresholdX?: number;
      thresholdY?: number;
      axisLabelX?: string;
      axisLabelY?: string;
      labelEvaluator?: string;
      labelTeam?: string;
      labelProject?: string;
    };
  }>('/sessions', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { adminCode, ...rest } = request.body;

    if (!rest.name || !adminCode) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'name and adminCode are required',
        statusCode: 400,
      });
    }

    const hashedCode = await hashCode(adminCode);

    const session = await app.prisma.session.create({
      data: {
        ...rest,
        adminCode: hashedCode,
      },
    });

    const { adminCode: _adminCode, ...result } = session;
    return reply.code(201).send(result);
  });

  // PATCH /sessions/:id — update session fields
  app.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      adminCode?: string;
      thresholdX?: number;
      thresholdY?: number;
      axisLabelX?: string;
      axisLabelY?: string;
      labelEvaluator?: string;
      labelTeam?: string;
      labelProject?: string;
    };
  }>('/sessions/:id', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { id } = request.params;
    const { adminCode, ...rest } = request.body;

    const existing = await app.prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    const data: Record<string, unknown> = { ...rest };
    if (adminCode) {
      data.adminCode = await hashCode(adminCode);
    }

    const session = await app.prisma.session.update({
      where: { id },
      data,
    });

    const { adminCode: _adminCode, ...result } = session;
    return reply.send(result);
  });

  // DELETE /sessions/:id — delete session (cascade)
  app.delete<{
    Params: { id: string };
  }>('/sessions/:id', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { id } = request.params;

    const existing = await app.prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    await app.prisma.session.delete({ where: { id } });
    return reply.code(204).send();
  });

  // POST /sessions/:id/activate — set status to ACTIVE
  app.post<{
    Params: { id: string };
  }>('/sessions/:id/activate', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { id } = request.params;

    const existing = await app.prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    if (existing.status !== 'DRAFT') {
      return reply.code(400).send({
        error: 'INVALID_STATUS_TRANSITION',
        message: 'Session can only be activated from DRAFT status',
        statusCode: 400,
      });
    }

    const session = await app.prisma.session.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    const { adminCode: _adminCode, ...result } = session;
    return reply.send(result);
  });

  // POST /sessions/:id/close — set status to CLOSED
  app.post<{
    Params: { id: string };
  }>('/sessions/:id/close', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { id } = request.params;

    const existing = await app.prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    if (existing.status !== 'ACTIVE') {
      return reply.code(400).send({
        error: 'INVALID_STATUS_TRANSITION',
        message: 'Session can only be closed from ACTIVE status',
        statusCode: 400,
      });
    }

    const session = await app.prisma.session.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    const { adminCode: _adminCode, ...result } = session;
    return reply.send(result);
  });

  // POST /sessions/:id/draft — set status to DRAFT
  app.post<{
    Params: { id: string };
  }>('/sessions/:id/draft', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { id } = request.params;

    const existing = await app.prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    // Check if there are scores or projects for this session
    const [scoreCount, projectCount] = await Promise.all([
      app.prisma.score.count({
        where: { project: { sessionId: id } },
      }),
      app.prisma.project.count({
        where: { sessionId: id },
      }),
    ]);

    if (scoreCount > 0) {
      return reply.code(400).send({
        error: 'CANNOT_DOWNGRADE',
        message: 'Cannot revert to DRAFT: scores have been submitted. Delete all scores first.',
        statusCode: 400,
      });
    }

    const session = await app.prisma.session.update({
      where: { id },
      data: { status: 'DRAFT' },
    });

    const { adminCode: _adminCode, ...result } = session;

    const response: Record<string, unknown> = { ...result };
    if (projectCount > 0) {
      response.warning = `Session reverted to DRAFT with ${projectCount} existing project(s). These projects will not be accessible until the session is activated again.`;
    }

    return reply.send(response);
  });
}
