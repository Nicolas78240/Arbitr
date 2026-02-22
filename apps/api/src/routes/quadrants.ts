import { FastifyInstance } from 'fastify';

interface QuadrantInput {
  position: string;
  label: string;
  icon: string;
  color: string;
}

const VALID_POSITIONS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];

export async function registerQuadrantRoutes(app: FastifyInstance): Promise<void> {
  const adminPreValidation = [app.authenticate, app.requireRole('ADMIN')];

  // GET /sessions/:sessionId/quadrants — list quadrants
  app.get<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId/quadrants', {
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

    const quadrants = await app.prisma.quadrant.findMany({
      where: { sessionId },
    });

    return reply.send(quadrants);
  });

  // PUT /sessions/:sessionId/quadrants — upsert all 4 quadrants atomically
  app.put<{
    Params: { sessionId: string };
    Body: QuadrantInput[];
  }>('/sessions/:sessionId/quadrants', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId } = request.params;
    const quadrants = request.body;

    const session = await app.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    if (!Array.isArray(quadrants) || quadrants.length !== 4) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Exactly 4 quadrants are required',
        statusCode: 400,
      });
    }

    const positions = quadrants.map((q) => q.position);
    const hasAllPositions = VALID_POSITIONS.every((p) => positions.includes(p));
    if (!hasAllPositions) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: `All 4 positions are required: ${VALID_POSITIONS.join(', ')}`,
        statusCode: 400,
      });
    }

    for (const q of quadrants) {
      if (!q.label || !q.icon || !q.color || !q.position) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Each quadrant requires position, label, icon, and color',
          statusCode: 400,
        });
      }
    }

    const result = await app.prisma.$transaction(async (tx) => {
      // Delete existing quadrants for this session
      await tx.quadrant.deleteMany({ where: { sessionId } });

      // Create all 4 new quadrants
      const created = await Promise.all(
        quadrants.map((q) =>
          tx.quadrant.create({
            data: {
              sessionId,
              position: q.position,
              label: q.label,
              icon: q.icon,
              color: q.color,
            },
          })
        )
      );

      return created;
    });

    return reply.send(result);
  });
}
