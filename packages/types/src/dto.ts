import { SessionStatus, Axis, FieldType, QuadrantPosition } from './enums';

export interface Session {
  id: string;
  name: string;
  description: string | null;
  status: SessionStatus;
  adminCode?: string; // never returned in API responses
  thresholdX: number;
  thresholdY: number;
  axisLabelX: string;
  axisLabelY: string;
  labelEvaluator: string;
  labelTeam: string;
  labelProject: string;
  createdAt: string;
  updatedAt: string;
  criteria?: Criterion[];
  evaluators?: Evaluator[];
  teams?: Team[];
  fields?: FormField[];
  projects?: Project[];
  quadrants?: Quadrant[];
}

export interface Criterion {
  id: string;
  sessionId: string;
  name: string;
  description: string | null;
  axis: Axis;
  min: number;
  max: number;
  weight: number;
  order: number;
}

export interface Evaluator {
  id: string;
  sessionId: string;
  name: string;
  code?: string; // never returned
}

export interface Team {
  id: string;
  sessionId: string;
  name: string;
  code?: string; // never returned
  project?: Project;
}

export interface FormField {
  id: string;
  sessionId: string;
  label: string;
  placeholder: string | null;
  type: FieldType;
  required: boolean;
  options: string[];
  order: number;
}

export interface Project {
  id: string;
  sessionId: string;
  teamId: string;
  name: string;
  number: number;
  formData: Record<string, unknown>;
  fileUrl: string | null;
  fileName: string | null;
  submittedAt: string;
  team?: Team;
}

export interface Score {
  id: string;
  evaluatorId: string;
  projectId: string;
  criterionId: string;
  value: number;
  comment: string | null;
  submittedAt: string;
  updatedAt: string;
}

export interface Quadrant {
  id: string;
  sessionId: string;
  position: QuadrantPosition;
  label: string;
  icon: string;
  color: string;
}

export interface User {
  id: string;
  externalId: string | null;
  email: string | null;
  name: string | null;
  createdAt: string;
}
