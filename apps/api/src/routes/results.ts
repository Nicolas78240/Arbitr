import { FastifyInstance } from 'fastify';
import {
  computeProjectScores,
  computeRanking,
  average,
  type CriterionScore,
  type ProjectScoreInput,
} from '@arbitr/scoring';

export async function registerResultRoutes(app: FastifyInstance): Promise<void> {
  // GET /sessions/:sessionId/results — computed results for a session
  // CLOSED sessions: public access (no auth required)
  // ACTIVE sessions: admin only (live preview)
  app.get<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId/results', async (request, reply) => {
    const { sessionId } = request.params;

    // Fetch session with all needed relations
    const session = await app.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        criteria: { orderBy: { order: 'asc' } },
        projects: {
          include: {
            team: { select: { name: true } },
            scores: true,
          },
        },
        quadrants: true,
      },
    });

    if (!session) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    // Access control: CLOSED = public, ACTIVE = admin or evaluator, DRAFT = forbidden
    if (session.status === 'DRAFT') {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'Results are not available for draft sessions',
        statusCode: 403,
      });
    }

    if (session.status === 'ACTIVE') {
      // Require admin or evaluator auth for live preview
      try {
        await request.jwtVerify();
        const user = request.user as { role?: string };
        if (user?.role !== 'ADMIN' && user?.role !== 'EVALUATOR') {
          return reply.code(403).send({
            error: 'FORBIDDEN',
            message: 'Only admins and evaluators can view results of active sessions',
            statusCode: 403,
          });
        }
      } catch {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required for active session results',
          statusCode: 401,
        });
      }
    }

    // Build scoring inputs for each project and compute per-criterion averages
    // Null scores (N/P abstentions) are passed through to the scoring engine,
    // which filters them out when computing averages.
    const projectInputs: ProjectScoreInput[] = session.projects.map((project) => {
      const criteriaScores: CriterionScore[] = session.criteria.map((criterion) => {
        const scores = project.scores.filter((s) => s.criterionId === criterion.id);
        return {
          criterionId: criterion.id,
          axis: criterion.axis as 'X' | 'Y',
          weight: criterion.weight,
          values: scores.map((s) => s.value),
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

    // Compute scores and ranking
    const projectScores = projectInputs.map((input) =>
      computeProjectScores(input, session.thresholdX, session.thresholdY),
    );
    const ranking = computeRanking(projectScores);

    // Build per-criterion average scores for each project
    const projectCriterionScores: Record<string, Record<string, number>> = {};
    for (const input of projectInputs) {
      const criterionAvgs: Record<string, number> = {};
      for (const cs of input.criteria) {
        criterionAvgs[cs.criterionId] = average(cs.values);
      }
      projectCriterionScores[input.projectId] = criterionAvgs;
    }

    // Build quadrant map
    const quadrantMap: Record<string, { label: string; icon: string; color: string }> = {};
    for (const q of session.quadrants) {
      quadrantMap[q.position] = { label: q.label, icon: q.icon, color: q.color };
    }

    // Build criteria list for reference
    const criteriaList = session.criteria.map((c) => ({
      id: c.id,
      name: c.name,
      axis: c.axis,
      weight: c.weight,
    }));

    return reply.send({
      session: {
        id: session.id,
        name: session.name,
        status: session.status,
        axisLabelX: session.axisLabelX,
        axisLabelY: session.axisLabelY,
        thresholdX: session.thresholdX,
        thresholdY: session.thresholdY,
        labelProject: session.labelProject,
        labelTeam: session.labelTeam,
      },
      quadrants: quadrantMap,
      criteria: criteriaList,
      ranking: ranking.map((r) => ({
        ...r,
        scores: projectCriterionScores[r.projectId] || {},
      })),
    });
  });

  // GET /sessions/:sessionId/results/export — CSV export (ADMIN only)
  app.get<{
    Params: { sessionId: string };
  }>('/sessions/:sessionId/results/export', {
    preValidation: [app.authenticate, app.requireRole('ADMIN', 'EVALUATOR')],
  }, async (request, reply) => {
    const { sessionId } = request.params;

    const session = await app.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        criteria: { orderBy: { order: 'asc' } },
        projects: {
          include: {
            team: { select: { name: true } },
            scores: true,
          },
        },
        quadrants: true,
      },
    });

    if (!session) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Session not found',
        statusCode: 404,
      });
    }

    // Build scoring inputs (null values = N/P abstentions, handled by scoring engine)
    const projectInputs: ProjectScoreInput[] = session.projects.map((project) => {
      const criteriaScores: CriterionScore[] = session.criteria.map((criterion) => {
        const scores = project.scores.filter((s) => s.criterionId === criterion.id);
        return {
          criterionId: criterion.id,
          axis: criterion.axis as 'X' | 'Y',
          weight: criterion.weight,
          values: scores.map((s) => s.value),
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

    const projectScores = projectInputs.map((input) =>
      computeProjectScores(input, session.thresholdX, session.thresholdY),
    );
    const ranking = computeRanking(projectScores);

    // Build per-criterion averages
    const projectCriterionScores: Record<string, Record<string, number>> = {};
    for (const input of projectInputs) {
      const criterionAvgs: Record<string, number> = {};
      for (const cs of input.criteria) {
        criterionAvgs[cs.criterionId] = average(cs.values);
      }
      projectCriterionScores[input.projectId] = criterionAvgs;
    }

    // Build quadrant label map
    const quadrantLabels: Record<string, string> = {};
    for (const q of session.quadrants) {
      quadrantLabels[q.position] = q.label;
    }

    // Escape CSV value
    function escapeCsv(value: string): string {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }

    // Build CSV header
    const criteriaHeaders = session.criteria.map((c) => escapeCsv(`${c.name} (${c.axis})`));
    const header = [
      'Rang',
      session.labelProject || 'Projet',
      session.labelTeam || 'Equipe',
      session.axisLabelX || 'Score X',
      session.axisLabelY || 'Score Y',
      'Score Global',
      'Quadrant',
      ...criteriaHeaders,
    ].join(',');

    // Build CSV rows
    const rows = ranking.map((project) => {
      const quadrantLabel = quadrantLabels[project.quadrant] || project.quadrant;
      const criterionValues = session.criteria.map((c) => {
        const avg = projectCriterionScores[project.projectId]?.[c.id] ?? 0;
        return avg.toFixed(2);
      });

      return [
        project.rank.toString(),
        escapeCsv(project.projectName),
        escapeCsv(project.teamName),
        project.scoreX.toFixed(2),
        project.scoreY.toFixed(2),
        project.scoreGlobal.toFixed(2),
        escapeCsv(quadrantLabel),
        ...criterionValues,
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');

    const filename = `resultats-${session.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(csv);
  });
}
