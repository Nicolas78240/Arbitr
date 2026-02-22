import { FastifyInstance } from 'fastify';
import { FieldType } from '@prisma/client';

export async function registerFieldRoutes(app: FastifyInstance): Promise<void> {
  const adminPreValidation = [app.authenticate, app.requireRole('ADMIN')];

  // GET /sessions/:sessionId/fields — list fields ordered by `order`
  app.get<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId/fields', {
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

    const fields = await app.prisma.formField.findMany({
      where: { sessionId },
      orderBy: { order: 'asc' },
    });

    return reply.send(fields);
  });

  // POST /sessions/:sessionId/fields — create field
  app.post<{
    Params: { sessionId: string };
    Body: {
      label: string;
      placeholder?: string;
      type: FieldType;
      required?: boolean;
      options?: string[];
      order?: number;
    };
  }>('/sessions/:sessionId/fields', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId } = request.params;
    const { label, placeholder, type, required, options, order } = request.body;

    if (!label || !type) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'label and type are required',
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

    const field = await app.prisma.formField.create({
      data: {
        sessionId,
        label,
        placeholder,
        type,
        required: required ?? false,
        options: options ?? [],
        order: order ?? 0,
      },
    });

    return reply.code(201).send(field);
  });

  // PATCH /sessions/:sessionId/fields/:id — update field
  app.patch<{
    Params: { sessionId: string; id: string };
    Body: {
      label?: string;
      placeholder?: string;
      type?: FieldType;
      required?: boolean;
      options?: string[];
      order?: number;
    };
  }>('/sessions/:sessionId/fields/:id', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId, id } = request.params;
    const body = request.body;

    const existing = await app.prisma.formField.findFirst({
      where: { id, sessionId },
    });
    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Field not found',
        statusCode: 404,
      });
    }

    const field = await app.prisma.formField.update({
      where: { id },
      data: body,
    });

    return reply.send(field);
  });

  // DELETE /sessions/:sessionId/fields/:id — delete field
  app.delete<{
    Params: { sessionId: string; id: string };
  }>('/sessions/:sessionId/fields/:id', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId, id } = request.params;

    const existing = await app.prisma.formField.findFirst({
      where: { id, sessionId },
    });
    if (!existing) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Field not found',
        statusCode: 404,
      });
    }

    await app.prisma.formField.delete({ where: { id } });
    return reply.code(204).send();
  });

  // POST /sessions/:sessionId/fields/reorder — reorder fields
  app.post<{
    Params: { sessionId: string };
    Body: { ids: string[] };
  }>('/sessions/:sessionId/fields/reorder', {
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
        app.prisma.formField.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    const fields = await app.prisma.formField.findMany({
      where: { sessionId },
      orderBy: { order: 'asc' },
    });

    return reply.send(fields);
  });
}
