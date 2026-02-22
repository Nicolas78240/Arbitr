import { Role } from './enums';

export interface JWTPayload {
  sub: string;
  role: Role;
  sessionId: string;
  name: string;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AdminLoginRequest {
  adminCode: string;
}

export interface EvaluatorLoginRequest {
  sessionId: string;
  evaluatorCode: string;
}

export interface TeamLoginRequest {
  sessionId: string;
  teamCode: string;
}

export interface RefreshRequest {
  refreshToken: string;
}
