import bcrypt from 'bcrypt';
import { AuthStrategy, AuthPayload, AuthContext } from '../types.js';

interface AdminCredentials {
  sessionId: string;
  adminCode: string;
}

interface EvaluatorCredentials {
  sessionId: string;
  evaluatorCode: string;
}

interface TeamCredentials {
  sessionId: string;
  teamCode: string;
}

export class AdminCodeStrategy implements AuthStrategy {
  readonly name = 'admin-code';

  async authenticate(credentials: unknown, ctx: AuthContext): Promise<AuthPayload> {
    const { sessionId, adminCode } = credentials as AdminCredentials;

    const session = await ctx.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AuthError('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const valid = await bcrypt.compare(adminCode, session.adminCode);
    if (!valid) {
      throw new AuthError('INVALID_CODE', 'Invalid admin code', 401);
    }

    return {
      sub: `admin:${session.id}`,
      role: 'ADMIN',
      sessionId: session.id,
      name: 'Admin',
    };
  }
}

export class EvaluatorCodeStrategy implements AuthStrategy {
  readonly name = 'evaluator-code';

  async authenticate(credentials: unknown, ctx: AuthContext): Promise<AuthPayload> {
    const { sessionId, evaluatorCode } = credentials as EvaluatorCredentials;

    const session = await ctx.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AuthError('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    if (session.status !== 'ACTIVE' && session.status !== 'CLOSED') {
      throw new AuthError('SESSION_NOT_ACTIVE', 'Session is not active', 403);
    }

    const evaluators = await ctx.prisma.evaluator.findMany({
      where: { sessionId },
    });

    for (const evaluator of evaluators) {
      const valid = await bcrypt.compare(evaluatorCode, evaluator.code);
      if (valid) {
        return {
          sub: evaluator.id,
          role: 'EVALUATOR',
          sessionId,
          name: evaluator.name,
        };
      }
    }

    throw new AuthError('INVALID_CODE', 'Invalid evaluator code', 401);
  }
}

export class TeamCodeStrategy implements AuthStrategy {
  readonly name = 'team-code';

  async authenticate(credentials: unknown, ctx: AuthContext): Promise<AuthPayload> {
    const { sessionId, teamCode } = credentials as TeamCredentials;

    const session = await ctx.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AuthError('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    if (session.status !== 'ACTIVE') {
      throw new AuthError('SESSION_NOT_ACTIVE', 'Session is not active for submissions', 403);
    }

    const teams = await ctx.prisma.team.findMany({
      where: { sessionId },
    });

    for (const team of teams) {
      const valid = await bcrypt.compare(teamCode, team.code);
      if (valid) {
        return {
          sub: team.id,
          role: 'TEAM',
          sessionId,
          name: team.name,
        };
      }
    }

    throw new AuthError('INVALID_CODE', 'Invalid team code', 401);
  }
}

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
