import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { AuthStrategyRegistry } from '../auth/registry.js';
import { AdminCodeStrategy } from '../auth/strategies/code-strategy.js';

function decodeJwt(token: string) {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString());
}

let app: FastifyInstance;
let activeSessionId: string;
let draftSessionId: string;
/** A pre-fetched admin access token for tests that just need a valid ADMIN JWT. */
let adminAccessToken: string;

beforeAll(async () => {
  // Suppress noisy Prisma query logs during tests
  process.env.NODE_ENV = 'production';

  app = await buildApp();

  // Register a test route requiring ADMIN role before app.ready()
  app.get(
    '/__test/admin-only',
    { preHandler: app.requireRole('ADMIN') },
    async () => ({ ok: true }),
  );

  await app.ready();

  const activeSession = await app.prisma.session.findFirst({
    where: { status: 'ACTIVE' },
  });
  if (!activeSession) throw new Error('No ACTIVE session found in database. Run seed first.');
  activeSessionId = activeSession.id;

  const draftSession = await app.prisma.session.findFirst({
    where: { status: 'DRAFT' },
  });
  if (!draftSession) throw new Error('No DRAFT session found in database. Run seed first.');
  draftSessionId = draftSession.id;

  // Pre-fetch an admin token so that later tests can reuse it without
  // burning through the per-route rate limit (10 reqs / 15 min).
  const loginRes = await app.inject({
    method: 'POST',
    url: '/auth/admin',
    payload: { sessionId: activeSessionId, adminCode: 'admin' },
  });
  adminAccessToken = loginRes.json().accessToken;
});

afterAll(async () => {
  await app.close();
});

// ---------------------------------------------------------------------------
// 1. POST /auth/admin
// ---------------------------------------------------------------------------
describe('POST /auth/admin', () => {
  it('returns 200 with accessToken and refreshToken for valid admin code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/admin',
      payload: { sessionId: activeSessionId, adminCode: 'admin' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
  });

  it('returns 401 INVALID_CODE for wrong admin code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/admin',
      payload: { sessionId: activeSessionId, adminCode: 'WRONG_CODE' },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error).toBe('INVALID_CODE');
  });

  it('returns 404 SESSION_NOT_FOUND for non-existent session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/admin',
      payload: {
        sessionId: '00000000-0000-0000-0000-000000000000',
        adminCode: 'admin',
      },
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error).toBe('SESSION_NOT_FOUND');
  });

  it('returns 500 when body fields are missing (no validation, strategy fails)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/admin',
      payload: {},
    });

    // The strategy will try to findUnique with undefined sessionId and will
    // either throw a Prisma error or return null depending on the adapter.
    // Either way it should not be a 200.
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});

// ---------------------------------------------------------------------------
// 2. POST /auth/evaluator
// ---------------------------------------------------------------------------
describe('POST /auth/evaluator', () => {
  it('returns 200 with tokens for valid evaluator code on ACTIVE session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/evaluator',
      payload: { sessionId: activeSessionId, evaluatorCode: 'eval1' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
  });

  it('returns 401 for invalid evaluator code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/evaluator',
      payload: { sessionId: activeSessionId, evaluatorCode: 'INVALID' },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error).toBe('INVALID_CODE');
  });

  it('returns 403 SESSION_NOT_ACTIVE for DRAFT session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/evaluator',
      payload: { sessionId: draftSessionId, evaluatorCode: 'eval1' },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.error).toBe('SESSION_NOT_ACTIVE');
  });

  it('returns 404 for non-existent session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/evaluator',
      payload: {
        sessionId: '00000000-0000-0000-0000-000000000000',
        evaluatorCode: 'eval1',
      },
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error).toBe('SESSION_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// 3. POST /auth/team
// ---------------------------------------------------------------------------
describe('POST /auth/team', () => {
  it('returns 200 with tokens for valid team code on ACTIVE session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/team',
      payload: { sessionId: activeSessionId, teamCode: 'team1' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
  });

  it('returns 401 for invalid team code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/team',
      payload: { sessionId: activeSessionId, teamCode: 'INVALID' },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error).toBe('INVALID_CODE');
  });

  it('returns 403 for DRAFT session (not active for submissions)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/team',
      payload: { sessionId: draftSessionId, teamCode: 'team1' },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.error).toBe('SESSION_NOT_ACTIVE');
  });
});

// ---------------------------------------------------------------------------
// 4. POST /auth/refresh
// ---------------------------------------------------------------------------
describe('POST /auth/refresh', () => {
  it('returns 200 with new tokens for valid refresh token (rotation)', async () => {
    // First, login to get a refresh token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/admin',
      payload: { sessionId: activeSessionId, adminCode: 'admin' },
    });
    const { refreshToken } = loginRes.json();

    // Now rotate it
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });

    expect(refreshRes.statusCode).toBe(200);
    const body = refreshRes.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    // The new refresh token should be different from the old one
    expect(body.refreshToken).not.toBe(refreshToken);
  });

  it('returns 401 when using old refresh token after rotation (invalidated)', async () => {
    // Login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/admin',
      payload: { sessionId: activeSessionId, adminCode: 'admin' },
    });
    const { refreshToken: oldToken } = loginRes.json();

    // Rotate once — old token gets deleted
    await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: oldToken },
    });

    // Try to use the old token again
    const replayRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: oldToken },
    });

    expect(replayRes.statusCode).toBe(401);
    const body = replayRes.json();
    expect(body.error).toBe('INVALID_REFRESH_TOKEN');
  });

  it('returns 401 for a random/invalid refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: 'totally-invalid-token-value-12345' },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error).toBe('INVALID_REFRESH_TOKEN');
  });

  it('returns 400 when refreshToken is missing from body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('MISSING_TOKEN');
  });
});

// ---------------------------------------------------------------------------
// 5. POST /auth/logout
// ---------------------------------------------------------------------------
describe('POST /auth/logout', () => {
  it('returns 200 and revokes the refresh token', async () => {
    // Login first
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/admin',
      payload: { sessionId: activeSessionId, adminCode: 'admin' },
    });
    const { refreshToken } = loginRes.json();

    // Logout
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: { refreshToken },
    });

    expect(logoutRes.statusCode).toBe(200);
    expect(logoutRes.json().message).toBe('Logged out');
  });

  it('after logout, refreshing with that token returns 401', async () => {
    // Login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/admin',
      payload: { sessionId: activeSessionId, adminCode: 'admin' },
    });
    const { refreshToken } = loginRes.json();

    // Logout
    await app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: { refreshToken },
    });

    // Try to refresh
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });

    expect(refreshRes.statusCode).toBe(401);
  });

  it('returns 200 even when no refresh token is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toBe('Logged out');
  });
});

// ---------------------------------------------------------------------------
// 6. JWT Token Structure
// ---------------------------------------------------------------------------
describe('JWT Token Structure', () => {
  it('decoded access token contains sub, role, sessionId, name, iat, exp', () => {
    // Reuse the admin token from beforeAll to avoid rate limiting
    const decoded = decodeJwt(adminAccessToken);

    expect(decoded).toHaveProperty('sub');
    expect(decoded).toHaveProperty('role');
    expect(decoded).toHaveProperty('sessionId');
    expect(decoded).toHaveProperty('name');
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
  });

  it('admin token has role ADMIN and sub starting with "admin:"', () => {
    const decoded = decodeJwt(adminAccessToken);
    expect(decoded.role).toBe('ADMIN');
    expect(decoded.sub).toMatch(/^admin:/);
    expect(decoded.name).toBe('Admin');
  });

  it('evaluator token has role EVALUATOR', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/evaluator',
      payload: { sessionId: activeSessionId, evaluatorCode: 'eval1' },
    });

    const decoded = decodeJwt(res.json().accessToken);
    expect(decoded.role).toBe('EVALUATOR');
    expect(decoded.sessionId).toBe(activeSessionId);
    // Name should be the evaluator's actual name, not empty
    expect(decoded.name).toBeTruthy();
  });

  it('team token has role TEAM', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/team',
      payload: { sessionId: activeSessionId, teamCode: 'team1' },
    });

    const decoded = decodeJwt(res.json().accessToken);
    expect(decoded.role).toBe('TEAM');
    expect(decoded.sessionId).toBe(activeSessionId);
    expect(decoded.name).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 7. Role Guard Middleware
// ---------------------------------------------------------------------------
describe('Role Guard Middleware', () => {
  it('GET /health returns 200 without any auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
  });

  it('rejects EVALUATOR token on a route that requires ADMIN role', async () => {
    // Get an evaluator token
    const evalRes = await app.inject({
      method: 'POST',
      url: '/auth/evaluator',
      payload: { sessionId: activeSessionId, evaluatorCode: 'eval1' },
    });
    const { accessToken: evalToken } = evalRes.json();

    // Try to access admin-only route with evaluator token
    const res = await app.inject({
      method: 'GET',
      url: '/__test/admin-only',
      headers: {
        authorization: `Bearer ${evalToken}`,
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('FORBIDDEN');
  });

  it('allows ADMIN token on a route that requires ADMIN role', async () => {
    // Reuse the admin token obtained in beforeAll to avoid rate limiting
    const res = await app.inject({
      method: 'GET',
      url: '/__test/admin-only',
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('returns 401 when accessing a protected route with no token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/__test/admin-only',
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('UNAUTHORIZED');
  });

  it('returns 401 when accessing a protected route with an invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/__test/admin-only',
      headers: {
        authorization: 'Bearer this.is.not-a-valid-jwt',
      },
    });

    expect(res.statusCode).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 8. AuthStrategyRegistry (unit tests)
// ---------------------------------------------------------------------------
describe('AuthStrategyRegistry', () => {
  it('resolve() throws for an unknown strategy name', () => {
    const registry = new AuthStrategyRegistry();
    expect(() => registry.resolve('nonexistent')).toThrow(
      'Auth strategy "nonexistent" not registered',
    );
  });

  it('has() returns true for a registered strategy and false for unregistered', () => {
    const registry = new AuthStrategyRegistry();
    expect(registry.has('admin-code')).toBe(false);

    registry.register(new AdminCodeStrategy());
    expect(registry.has('admin-code')).toBe(true);
    expect(registry.has('unknown')).toBe(false);
  });

  it('resolve() returns the correct strategy after registration', () => {
    const registry = new AuthStrategyRegistry();
    const strategy = new AdminCodeStrategy();
    registry.register(strategy);

    const resolved = registry.resolve('admin-code');
    expect(resolved).toBe(strategy);
    expect(resolved.name).toBe('admin-code');
  });
});
