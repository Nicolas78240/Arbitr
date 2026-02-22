import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { createProjectSchema, updateProjectSchema } from '@arbitr/validation';

interface AuthUser {
  sub: string;
  role: 'ADMIN' | 'EVALUATOR' | 'TEAM';
  sessionId: string;
  name: string;
}

export async function registerProjectRoutes(app: FastifyInstance): Promise<void> {
  const teamPreValidation = [app.authenticate, app.requireRole('TEAM')];
  const authenticatedPreValidation = [app.authenticate, app.requireRole('ADMIN', 'EVALUATOR', 'TEAM')];
  const adminPreValidation = [app.authenticate, app.requireRole('ADMIN')];

  // GET /sessions/:sessionId/submit-info — Get session info for submission form (team accessible)
  app.get<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId/submit-info', {
    preValidation: teamPreValidation,
  }, async (request, reply) => {
    const user = request.user as AuthUser;
    const { sessionId } = request.params;

    // Team can only access their own session
    if (sessionId !== user.sessionId) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You can only access your own session',
        statusCode: 403,
      });
    }

    const session = await app.prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        labelProject: true,
        fields: { orderBy: { order: 'asc' } },
      },
    });

    if (!session) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    return reply.send(session);
  });

  // POST /projects — Team submits a project for their session
  app.post<{
    Body: {
      name: string;
      formData: Record<string, unknown>;
      fileUrl?: string;
      fileName?: string;
    };
  }>('/projects', {
    preValidation: teamPreValidation,
  }, async (request, reply) => {
    const user = request.user as AuthUser;

    // Validate body with Zod
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const { name, formData, fileUrl, fileName } = parsed.data;

    // Check session exists and is ACTIVE
    const session = await app.prisma.session.findUnique({
      where: { id: user.sessionId },
    });

    if (!session) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    if (session.status !== 'ACTIVE') {
      return reply.code(400).send({
        error: 'SESSION_NOT_ACTIVE',
        message: 'Projects can only be submitted when the session is ACTIVE',
        statusCode: 400,
      });
    }

    // Check team hasn't already submitted (one project per team per session)
    const existingProject = await app.prisma.project.findUnique({
      where: { teamId: user.sub },
    });

    if (existingProject) {
      return reply.code(409).send({
        error: 'DUPLICATE_SUBMISSION',
        message: 'Your team has already submitted a project for this session',
        statusCode: 409,
      });
    }

    // Calculate project number (auto-increment per session)
    const projectCount = await app.prisma.project.count({
      where: { sessionId: user.sessionId },
    });

    const project = await app.prisma.project.create({
      data: {
        sessionId: user.sessionId,
        teamId: user.sub,
        name,
        number: projectCount + 1,
        formData: (formData || {}) as Prisma.InputJsonValue,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
      },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    return reply.code(201).send(project);
  });

  // POST /sessions/:sessionId/projects — Alias: Team submits a project (nested route)
  app.post<{
    Params: { sessionId: string };
    Body: {
      name: string;
      formData: Record<string, unknown>;
      fileUrl?: string;
      fileName?: string;
    };
  }>('/sessions/:sessionId/projects', {
    preValidation: teamPreValidation,
  }, async (request, reply) => {
    const user = request.user as AuthUser;
    const { sessionId } = request.params;

    // Validate team belongs to this session
    if (sessionId !== user.sessionId) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You can only submit to your own session',
        statusCode: 403,
      });
    }

    // Validate body with Zod
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const { name, formData, fileUrl, fileName } = parsed.data;

    // Check session exists and is ACTIVE
    const session = await app.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    if (session.status !== 'ACTIVE') {
      return reply.code(400).send({
        error: 'SESSION_NOT_ACTIVE',
        message: 'Projects can only be submitted when the session is ACTIVE',
        statusCode: 400,
      });
    }

    // Check team hasn't already submitted (one project per team per session)
    const existingProject = await app.prisma.project.findUnique({
      where: { teamId: user.sub },
    });

    if (existingProject) {
      return reply.code(409).send({
        error: 'DUPLICATE_SUBMISSION',
        message: 'Your team has already submitted a project for this session',
        statusCode: 409,
      });
    }

    // Calculate project number (auto-increment per session)
    const projectCount = await app.prisma.project.count({
      where: { sessionId },
    });

    const project = await app.prisma.project.create({
      data: {
        sessionId,
        teamId: user.sub,
        name,
        number: projectCount + 1,
        formData: (formData || {}) as Prisma.InputJsonValue,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
      },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    return reply.code(201).send(project);
  });

  // GET /projects/:id — Get project details
  app.get<{
    Params: { id: string };
  }>('/projects/:id', {
    preValidation: authenticatedPreValidation,
  }, async (request, reply) => {
    const user = request.user as AuthUser;
    const { id } = request.params;

    const project = await app.prisma.project.findUnique({
      where: { id },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    if (!project) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Project not found',
        statusCode: 404,
      });
    }

    // Team can only see their own project
    if (user.role === 'TEAM' && project.teamId !== user.sub) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You can only view your own project',
        statusCode: 403,
      });
    }

    // Evaluator can only see projects in their session
    if (user.role === 'EVALUATOR' && project.sessionId !== user.sessionId) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You can only view projects in your session',
        statusCode: 403,
      });
    }

    return reply.send(project);
  });

  // GET /sessions/:sessionId/projects — List all projects in a session
  app.get<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId/projects', {
    preValidation: authenticatedPreValidation,
  }, async (request, reply) => {
    const user = request.user as AuthUser;
    const { sessionId } = request.params;

    // Evaluator can only see projects in their session
    if (user.role === 'EVALUATOR' && sessionId !== user.sessionId) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You can only view projects in your session',
        statusCode: 403,
      });
    }

    // Team can only access their own session
    if (user.role === 'TEAM' && sessionId !== user.sessionId) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You can only access your own session',
        statusCode: 403,
      });
    }

    const session = await app.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    // TEAM: only sees their own project
    if (user.role === 'TEAM') {
      const projects = await app.prisma.project.findMany({
        where: { sessionId, teamId: user.sub },
        include: {
          team: { select: { id: true, name: true } },
        },
        orderBy: { number: 'asc' },
      });
      return reply.send(projects);
    }

    // ADMIN & EVALUATOR: see all projects (evaluator blindness is enforced at scores level)
    const projects = await app.prisma.project.findMany({
      where: { sessionId },
      include: {
        team: { select: { id: true, name: true } },
      },
      orderBy: { number: 'asc' },
    });

    return reply.send(projects);
  });

  // GET /sessions/:sessionId/projects/:projectId — Get single project (nested route)
  app.get<{
    Params: { sessionId: string; projectId: string };
  }>('/sessions/:sessionId/projects/:projectId', {
    preValidation: authenticatedPreValidation,
  }, async (request, reply) => {
    const user = request.user as AuthUser;
    const { sessionId, projectId } = request.params;

    const project = await app.prisma.project.findFirst({
      where: { id: projectId, sessionId },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    if (!project) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Project not found',
        statusCode: 404,
      });
    }

    // Team can only see their own project
    if (user.role === 'TEAM' && project.teamId !== user.sub) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You can only view your own project',
        statusCode: 403,
      });
    }

    // Evaluator can only see projects in their session
    if (user.role === 'EVALUATOR' && project.sessionId !== user.sessionId) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You can only view projects in your session',
        statusCode: 403,
      });
    }

    return reply.send(project);
  });

  // GET /projects/mine — Team gets their own project
  app.get('/projects/mine', {
    preValidation: teamPreValidation,
  }, async (request, reply) => {
    const user = request.user as AuthUser;

    const project = await app.prisma.project.findUnique({
      where: { teamId: user.sub },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    if (!project) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'No project submitted yet',
        statusCode: 404,
      });
    }

    return reply.send(project);
  });

  // PATCH /projects/:id — Team updates their project (only if session is ACTIVE)
  app.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      formData?: Record<string, unknown>;
      fileUrl?: string;
      fileName?: string;
    };
  }>('/projects/:id', {
    preValidation: teamPreValidation,
  }, async (request, reply) => {
    const user = request.user as AuthUser;
    const { id } = request.params;

    // Validate body with Zod
    const parsed = updateProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const project = await app.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Project not found',
        statusCode: 404,
      });
    }

    // Team can only update their own project
    if (project.teamId !== user.sub) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You can only update your own project',
        statusCode: 403,
      });
    }

    // Check session is ACTIVE
    const session = await app.prisma.session.findUnique({
      where: { id: project.sessionId },
    });

    if (!session || session.status !== 'ACTIVE') {
      return reply.code(400).send({
        error: 'SESSION_NOT_ACTIVE',
        message: 'Projects can only be updated when the session is ACTIVE',
        statusCode: 400,
      });
    }

    const { name, formData, fileUrl, fileName } = parsed.data;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (formData !== undefined) data.formData = formData as Prisma.InputJsonValue;
    if (fileUrl !== undefined) data.fileUrl = fileUrl;
    if (fileName !== undefined) data.fileName = fileName;

    const updated = await app.prisma.project.update({
      where: { id },
      data,
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    return reply.send(updated);
  });

  // PUT /sessions/:sessionId/projects/:projectId — Update project (TEAM only, session must be ACTIVE)
  app.put<{
    Params: { sessionId: string; projectId: string };
    Body: {
      name?: string;
      formData?: Record<string, unknown>;
      fileUrl?: string;
      fileName?: string;
    };
  }>('/sessions/:sessionId/projects/:projectId', {
    preValidation: teamPreValidation,
  }, async (request, reply) => {
    const user = request.user as AuthUser;
    const { sessionId, projectId } = request.params;

    // Validate team belongs to this session
    if (sessionId !== user.sessionId) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You can only update projects in your own session',
        statusCode: 403,
      });
    }

    // Validate body with Zod
    const parsed = updateProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const project = await app.prisma.project.findFirst({
      where: { id: projectId, sessionId },
    });

    if (!project) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Project not found',
        statusCode: 404,
      });
    }

    // Team can only update their own project
    if (project.teamId !== user.sub) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You can only update your own project',
        statusCode: 403,
      });
    }

    // Check session is ACTIVE
    const session = await app.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'ACTIVE') {
      return reply.code(400).send({
        error: 'SESSION_NOT_ACTIVE',
        message: 'Projects can only be updated when the session is ACTIVE',
        statusCode: 400,
      });
    }

    const { name, formData, fileUrl, fileName } = parsed.data;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (formData !== undefined) data.formData = formData as Prisma.InputJsonValue;
    if (fileUrl !== undefined) data.fileUrl = fileUrl;
    if (fileName !== undefined) data.fileName = fileName;

    const updated = await app.prisma.project.update({
      where: { id: projectId },
      data,
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    return reply.send(updated);
  });

  // DELETE /sessions/:sessionId/projects/:projectId — Delete project (ADMIN only)
  app.delete<{
    Params: { sessionId: string; projectId: string };
  }>('/sessions/:sessionId/projects/:projectId', {
    preValidation: adminPreValidation,
  }, async (request, reply) => {
    const { sessionId, projectId } = request.params;

    const project = await app.prisma.project.findFirst({
      where: { id: projectId, sessionId },
    });

    if (!project) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Project not found',
        statusCode: 404,
      });
    }

    // Cascade: delete scores -> project
    await app.prisma.$transaction(async (tx) => {
      await tx.score.deleteMany({ where: { projectId } });
      await tx.project.delete({ where: { id: projectId } });
    });

    return reply.code(204).send();
  });
}
