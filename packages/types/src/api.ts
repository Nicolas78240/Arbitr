export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  db: 'ok' | 'error';
  version: string;
}

export interface ComputedProjectScore {
  projectId: string;
  projectName: string;
  teamName: string;
  number: number;
  scoreX: number;
  scoreY: number;
  scoreGlobal: number;
  quadrant: string;
  evaluatorCount: number;
}

export interface RankedProject extends ComputedProjectScore {
  rank: number;
}
