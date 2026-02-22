export interface AuthPayload {
  sub: string;
  role: 'ADMIN' | 'EVALUATOR' | 'TEAM';
  sessionId: string;
  name: string;
}

export interface AuthStrategy {
  readonly name: string;
  authenticate(credentials: unknown, context: AuthContext): Promise<AuthPayload>;
}

export interface AuthContext {
  prisma: import('@prisma/client').PrismaClient;
}
