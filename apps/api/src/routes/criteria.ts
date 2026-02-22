import { FastifyInstance } from 'fastify';
import { Axis } from '@prisma/client';

export async function registerCriteriaRoutes(app: FastifyInstance): Promise<void> {
  const adminPreValidation = [app.authenticate, app.requireRole('ADMIN')];

  // Helper: validate weights per axis don't exceed 100%
  async function validateWeights(sessionId: string, excludeId?: string): Promise<{ valid: boolean; axis?: string }> {
    const criteria = await app.prisma.criterion.findMany({
      where: { sessionId },
    });

    const filtered = excludeId ? criteria.filter((c) => c.id !== excludeId) : criteria;

    const sumX = filtered.filter((c) => c.axis === 'X').reduce((sum, c) => sum + c.weight, 0);
    const sumY = filtered.filter((c) => c.axis === 'Y').reduce((sum, c) => sum + c.weight, 0);

    if (sumX > 100) return { valid: false, axis: 'X' };
    if (sumY > 100) return { valid: false, axis: 'Y' };
    return { valid: true };
  }

  // GET /sessions/:sessionId/criteria — list criteria for session
  app.get<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId/criteria', {
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

    const criteria = await app.prisma.criterion.findMany({
      where: { sessionId },
      orderBy: { order: 'asc' },
    });

    return reply.send(criteria);
  });

  // POST /sessions/:sessionId/criteria — create criterion
  app.post<{
    Params: { sessionId: string };
    Body: {
      name: string;
      description?: string;
      axis: Axis;
      min?: number;
      max?: number;
      weight: number;
      order?: number;
    };
  }>('/sessions/:sessionId/criteria', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId } = request.params;
    const { name, description, axis, min, max, weight, order } = request.body;

    const session = await app.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    if (!name || !axis || weight === undefined) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'name, axis, and weight are required',
        statusCode: 400,
      });
    }

    // Check weights before creating
    const existingCriteria = await app.prisma.criterion.findMany({
      where: { sessionId },
    });
    const currentSum = existingCriteria
      .filter((c) => c.axis === axis)
      .reduce((sum, c) => sum + c.weight, 0);

    if (currentSum + weight > 100) {
      return reply.code(400).send({
        error: 'INVALID_WEIGHTS',
        message: `Total weight for axis ${axis} would exceed 100% (current: ${currentSum}%, adding: ${weight}%)`,
        statusCode: 400,
      });
    }

    const criterion = await app.prisma.criterion.create({
      data: {
        sessionId,
        name,
        description,
        axis,
        min: min ?? 0,
        max: max ?? 5,
        weight,
        order: order ?? 0,
      },
    });

    return reply.code(201).send(criterion);
  });

  // PATCH /sessions/:sessionId/criteria/:id — update criterion
  app.patch<{
    Params: { sessionId: string; id: string };
    Body: {
      name?: string;
      description?: string;
      axis?: Axis;
      min?: number;
      max?: number;
      weight?: number;
      order?: number;
    };
  }>('/sessions/:sessionId/criteria/:id', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId, id } = request.params;
    const body = request.body;

    const existing = await app.prisma.criterion.findFirst({
      where: { id, sessionId },
    });
    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Criterion not found',
        statusCode: 404,
      });
    }

    // If weight or axis changed, validate totals
    const newAxis = body.axis ?? existing.axis;
    const newWeight = body.weight ?? existing.weight;

    const otherCriteria = await app.prisma.criterion.findMany({
      where: { sessionId, id: { not: id } },
    });
    const sumForAxis = otherCriteria
      .filter((c) => c.axis === newAxis)
      .reduce((sum, c) => sum + c.weight, 0);

    if (sumForAxis + newWeight > 100) {
      return reply.code(400).send({
        error: 'INVALID_WEIGHTS',
        message: `Total weight for axis ${newAxis} would exceed 100% (other criteria: ${sumForAxis}%, this: ${newWeight}%)`,
        statusCode: 400,
      });
    }

    const criterion = await app.prisma.criterion.update({
      where: { id },
      data: body,
    });

    return reply.send(criterion);
  });

  // DELETE /sessions/:sessionId/criteria/:id — delete criterion
  app.delete<{
    Params: { sessionId: string; id: string };
  }>('/sessions/:sessionId/criteria/:id', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId, id } = request.params;

    const existing = await app.prisma.criterion.findFirst({
      where: { id, sessionId },
    });
    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Criterion not found',
        statusCode: 404,
      });
    }

    await app.prisma.criterion.delete({ where: { id } });
    return reply.code(204).send();
  });

  // POST /sessions/:sessionId/criteria/reorder — reorder criteria
  app.post<{
    Params: { sessionId: string };
    Body: { ids: string[] };
  }>('/sessions/:sessionId/criteria/reorder', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId } = request.params;
    const { ids } = request.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'ids array is required',
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

    await app.prisma.$transaction(
      ids.map((id, index) =>
        app.prisma.criterion.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    const criteria = await app.prisma.criterion.findMany({
      where: { sessionId },
      orderBy: { order: 'asc' },
    });

    return reply.send(criteria);
  });
}
