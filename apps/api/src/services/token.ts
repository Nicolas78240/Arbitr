import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import { AuthPayload } from '../auth/types.js';

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export async function generateTokens(
  app: FastifyInstance,
  payload: AuthPayload,
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = app.jwt.sign(
    {
      sub: payload.sub,
      role: payload.role,
      sessionId: payload.sessionId,
      name: payload.name,
    },
    { expiresIn: '15m' },
  );

  const refreshToken = randomBytes(48).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await app.prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: payload.sub,
      role: payload.role,
      sessionId: payload.sessionId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(
  app: FastifyInstance,
  oldToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const stored = await app.prisma.refreshToken.findUnique({
    where: { token: oldToken },
  });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) {
      await app.prisma.refreshToken.delete({ where: { id: stored.id } });
    }
    return null;
  }

  // Delete old token (rotation)
  await app.prisma.refreshToken.delete({ where: { id: stored.id } });

  // Rebuild payload from stored data
  let name = 'Unknown';

  if (stored.role === 'ADMIN') {
    name = 'Admin';
  } else if (stored.role === 'EVALUATOR') {
    const evaluator = await app.prisma.evaluator.findUnique({
      where: { id: stored.userId },
    });
    name = evaluator?.name ?? 'Evaluator';
  } else if (stored.role === 'TEAM') {
    const team = await app.prisma.team.findUnique({
      where: { id: stored.userId },
    });
    name = team?.name ?? 'Team';
  }

  const payload: AuthPayload = {
    sub: stored.userId,
    role: stored.role as AuthPayload['role'],
    sessionId: stored.sessionId ?? '',
    name,
  };

  return generateTokens(app, payload);
}

export async function revokeRefreshToken(
  app: FastifyInstance,
  token: string,
): Promise<void> {
  await app.prisma.refreshToken.deleteMany({
    where: { token },
  });
}

export async function revokeAllUserTokens(
  app: FastifyInstance,
  userId: string,
): Promise<void> {
  await app.prisma.refreshToken.deleteMany({
    where: { userId },
  });
}
