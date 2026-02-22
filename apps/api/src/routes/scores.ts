import { FastifyInstance } from 'fastify';
import { computeProjectScores, computeRanking, CriterionScore } from '@arbitr/scoring';

export async function registerScoreRoutes(app: FastifyInstance): Promise<void> {
  const evaluatorPreValidation = [app.authenticate, app.requireRole('EVALUATOR')];

  // POST /sessions/:sessionId/scores — Submit/update a single score (EVALUATOR only)
  app.post<{
    Params: { sessionId: string };
    Body: { projectId: string; criterionId: string; value: number | null; comment?: string };
  }>('/sessions/:sessionId/scores', {
    preValidation: evaluatorPreValidation,
  }, async (request, reply) => {
    const user = request.user as { sub: string; role: string; sessionId: string };
    const { sessionId } = request.params;
    const { projectId, criterionId, value, comment } = request.body;

    // Validate evaluator belongs to this session
    if (sessionId !== user.sessionId) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You do not have access to this session',
        statusCode: 403,
      });
    }

    // Validate body
    if (!projectId || !criterionId || (value !== null && (typeof value !== 'number' || value < 0 || value > 5))) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'projectId, criterionId, and value (0-5 or null for N/P) are required',
        statusCode: 400,
      });
    }

    // Verify session is ACTIVE
    const session = await app.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Session not found', statusCode: 404 });
    }
    if (session.status !== 'ACTIVE') {
      return reply.code(400).send({
        error: 'SESSION_NOT_ACTIVE',
        message: 'Scores can only be submitted when the session is ACTIVE',
        statusCode: 400,
      });
    }

    // Verify project belongs to session
    const project = await app.prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.sessionId !== sessionId) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Project does not belong to this session',
        statusCode: 400,
      });
    }

    // Verify criterion belongs to session
    const criterion = await app.prisma.criterion.findUnique({ where: { id: criterionId } });
    if (!criterion || criterion.sessionId !== sessionId) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Criterion does not belong to this session',
        statusCode: 400,
      });
    }

    // Upsert the score
    const savedScore = await app.prisma.score.upsert({
      where: {
        evaluatorId_projectId_criterionId: {
          evaluatorId: user.sub,
          projectId,
          criterionId,
        },
      },
      create: {
        evaluatorId: user.sub,
        projectId,
        criterionId,
        value,
        comment: comment ?? null,
      },
      update: {
        value,
        comment: comment ?? null,
      },
    });

    return reply.code(200).send({
      id: savedScore.id,
      criterionId: savedScore.criterionId,
      projectId: savedScore.projectId,
      value: savedScore.value,
      comment: savedScore.comment,
      submittedAt: savedScore.submittedAt,
      updatedAt: savedScore.updatedAt,
    });
  });

  // POST /sessions/:sessionId/scores/bulk — Submit multiple scores at once (EVALUATOR only)
  app.post<{
    Params: { sessionId: string };
    Body: {
      projectId: string;
      scores: Array<{ criterionId: string; value: number | null; comment?: string }>;
    };
  }>('/sessions/:sessionId/scores/bulk', {
    preValidation: evaluatorPreValidation,
  }, async (request, reply) => {
    const user = request.user as { sub: string; role: string; sessionId: string };
    const { sessionId } = request.params;
    const { projectId, scores } = request.body;

    // Validate evaluator belongs to this session
    if (sessionId !== user.sessionId) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You do not have access to this session',
        statusCode: 403,
      });
    }

    // Validate body
    if (!projectId || !scores || !Array.isArray(scores) || scores.length === 0) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'projectId and scores array are required',
        statusCode: 400,
      });
    }

    // Validate score values are 0-5 or null (N/P)
    for (const score of scores) {
      if (!score.criterionId || (score.value !== null && (typeof score.value !== 'number' || score.value < 0 || score.value > 5))) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Each score must have a criterionId and a value between 0 and 5, or null for N/P',
          statusCode: 400,
        });
      }
    }

    // Verify session is ACTIVE
    const session = await app.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Session not found', statusCode: 404 });
    }
    if (session.status !== 'ACTIVE') {
      return reply.code(400).send({
        error: 'SESSION_NOT_ACTIVE',
        message: 'Scores can only be submitted when the session is ACTIVE',
        statusCode: 400,
      });
    }

    // Verify project belongs to session
    const project = await app.prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.sessionId !== sessionId) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Project does not belong to this session',
        statusCode: 400,
      });
    }

    // Get all criteria for this session and validate
    const sessionCriteria = await app.prisma.criterion.findMany({
      where: { sessionId },
    });
    const criteriaIds = new Set(sessionCriteria.map((c) => c.id));

    for (const score of scores) {
      if (!criteriaIds.has(score.criterionId)) {
        return reply.code(400).send({
          error: 'INVALID_CRITERION',
          message: `Criterion ${score.criterionId} does not belong to this session`,
          statusCode: 400,
        });
      }
    }

    // Upsert scores in a transaction
    const upserts = scores.map((score) =>
      app.prisma.score.upsert({
        where: {
          evaluatorId_projectId_criterionId: {
            evaluatorId: user.sub,
            projectId,
            criterionId: score.criterionId,
          },
        },
        create: {
          evaluatorId: user.sub,
          projectId,
          criterionId: score.criterionId,
          value: score.value,
          comment: score.comment ?? null,
        },
        update: {
          value: score.value,
          comment: score.comment ?? null,
        },
      })
    );

    const savedScores = await app.prisma.$transaction(upserts);

    // Return only the evaluator's own scores (blindness enforced)
    const result = savedScores.map((s) => ({
      id: s.id,
      criterionId: s.criterionId,
      projectId: s.projectId,
      value: s.value,
      comment: s.comment,
      submittedAt: s.submittedAt,
      updatedAt: s.updatedAt,
    }));

    return reply.code(200).send(result);
  });

  // GET /sessions/:sessionId/scores/mine — Get current evaluator's scores for entire session (EVALUATOR only)
  app.get<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId/scores/mine', {
    preValidation: evaluatorPreValidation,
  }, async (request, reply) => {
    const user = request.user as { sub: string; role: string; sessionId: string };
    const { sessionId } = request.params;

    // Validate evaluator belongs to this session
    if (sessionId !== user.sessionId) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You do not have access to this session',
        statusCode: 403,
      });
    }

    const session = await app.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Session not found', statusCode: 404 });
    }

    // Get all projects in this session
    const projects = await app.prisma.project.findMany({
      where: { sessionId },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);

    // Return ONLY the requesting evaluator's scores (blindness enforced), grouped by project
    const scores = await app.prisma.score.findMany({
      where: {
        evaluatorId: user.sub,
        projectId: { in: projectIds },
      },
      select: {
        id: true,
        criterionId: true,
        projectId: true,
        value: true,
        comment: true,
        submittedAt: true,
        updatedAt: true,
      },
    });

    // Group by project
    const grouped: Record<string, typeof scores> = {};
    for (const score of scores) {
      if (!grouped[score.projectId]) {
        grouped[score.projectId] = [];
      }
      grouped[score.projectId].push(score);
    }

    return reply.send(grouped);
  });

  // GET /projects/:projectId/scores/mine — Get current evaluator's scores for a project
  app.get<{
    Params: { projectId: string };
  }>('/projects/:projectId/scores/mine', {
    preValidation: evaluatorPreValidation,
  }, async (request, reply) => {
    const user = request.user as { sub: string; role: string; sessionId: string };
    const { projectId } = request.params;

    // Verify project exists and belongs to the evaluator's session
    const project = await app.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Project not found',
        statusCode: 404,
      });
    }

    if (project.sessionId !== user.sessionId) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'Project does not belong to your session',
        statusCode: 403,
      });
    }

    // Return ONLY the requesting evaluator's scores (blindness enforced)
    const scores = await app.prisma.score.findMany({
      where: {
        evaluatorId: user.sub,
        projectId,
      },
      select: {
        id: true,
        criterionId: true,
        projectId: true,
        value: true,
        comment: true,
        submittedAt: true,
        updatedAt: true,
      },
    });

    return reply.send(scores);
  });

  // GET /sessions/:sessionId/scores/summary — Aggregated scores for results
  app.get<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId/scores/summary', async (request, reply) => {
    const { sessionId } = request.params;

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

    // Auth check: admin can always access, others only when session is CLOSED
    const user = request.user as { role?: string } | undefined;
    let isAuthenticated = false;
    let isAdmin = false;

    try {
      await request.jwtVerify();
      isAuthenticated = true;
      const verifiedUser = request.user as { role?: string };
      isAdmin = verifiedUser?.role === 'ADMIN';
    } catch {
      // Not authenticated
    }

    if (session.status !== 'CLOSED' && !isAdmin) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'Scores summary is only available when the session is CLOSED',
        statusCode: 403,
      });
    }

    // Get all projects with their scores and criteria
    const projects = await app.prisma.project.findMany({
      where: { sessionId },
      include: {
        team: { select: { name: true } },
        scores: {
          include: {
            criterion: true,
          },
        },
      },
    });

    const criteria = await app.prisma.criterion.findMany({
      where: { sessionId },
    });

    // Build input for scoring functions (null values = N/P abstentions, handled by scoring engine)
    const projectScoreInputs = projects.map((project) => {
      const criteriaScores: CriterionScore[] = criteria.map((criterion) => {
        const criterionScores = project.scores
          .filter((s) => s.criterionId === criterion.id)
          .map((s) => s.value);

        return {
          criterionId: criterion.id,
          axis: criterion.axis as 'X' | 'Y',
          weight: criterion.weight,
          values: criterionScores,
        };
      });

      return {
        projectId: project.id,
        projectName: project.name,
        teamName: project.team.name,
        number: project.number,
        criteria: criteriaScores,
      };
    });

    const projectScores = projectScoreInputs.map((input) =>
      computeProjectScores(input, session.thresholdX, session.thresholdY)
    );

    const ranking = computeRanking(projectScores);

    return reply.send({
      sessionId,
      thresholdX: session.thresholdX,
      thresholdY: session.thresholdY,
      axisLabelX: session.axisLabelX,
      axisLabelY: session.axisLabelY,
      projects: ranking,
    });
  });

  // GET /sessions/:sessionId/my-progress — Evaluator's progress across all projects
  app.get<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId/my-progress', {
    preValidation: evaluatorPreValidation,
  }, async (request, reply) => {
    const user = request.user as { sub: string; role: string; sessionId: string };
    const { sessionId } = request.params;

    if (sessionId !== user.sessionId) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'You do not have access to this session',
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

    // Get all projects for the session
    const projects = await app.prisma.project.findMany({
      where: { sessionId },
      include: {
        team: { select: { name: true } },
      },
      orderBy: { number: 'asc' },
    });

    // Get all criteria for the session
    const criteria = await app.prisma.criterion.findMany({
      where: { sessionId },
      orderBy: { order: 'asc' },
    });

    // Get all scores by this evaluator for this session's projects
    const projectIds = projects.map((p) => p.id);
    const myScores = await app.prisma.score.findMany({
      where: {
        evaluatorId: user.sub,
        projectId: { in: projectIds },
      },
      select: {
        projectId: true,
        criterionId: true,
        value: true,
      },
    });

    // Group scores by project
    // A Score record with value=null means N/P (deliberate abstention) — it still counts as "evaluated"
    const scoresByProject = new Map<string, Array<{ criterionId: string; value: number | null }>>();
    for (const score of myScores) {
      const existing = scoresByProject.get(score.projectId) || [];
      existing.push({ criterionId: score.criterionId, value: score.value });
      scoresByProject.set(score.projectId, existing);
    }

    const totalCriteria = criteria.length;
    const progress = projects.map((project) => {
      const projectScores = scoresByProject.get(project.id) || [];
      return {
        projectId: project.id,
        projectName: project.name,
        projectNumber: project.number,
        teamName: project.team.name,
        scoredCriteria: projectScores.length,
        totalCriteria,
        completed: projectScores.length >= totalCriteria,
      };
    });

    const completedCount = progress.filter((p) => p.completed).length;

    return reply.send({
      sessionId,
      sessionName: session.name,
      sessionStatus: session.status,
      axisLabelX: session.axisLabelX,
      axisLabelY: session.axisLabelY,
      evaluatorId: user.sub,
      totalProjects: projects.length,
      completedProjects: completedCount,
      criteria: criteria.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        axis: c.axis,
        weight: c.weight,
        order: c.order,
      })),
      projects: progress,
    });
  });
}
