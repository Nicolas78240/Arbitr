export interface CriterionScore {
  criterionId: string;
  axis: 'X' | 'Y';
  weight: number;
  values: (number | null)[];
}

export interface ProjectScoreInput {
  projectId: string;
  projectName: string;
  teamName: string;
  number: number;
  criteria: CriterionScore[];
}

export interface ProjectScores {
  projectId: string;
  projectName: string;
  teamName: string;
  number: number;
  scoreX: number;
  scoreY: number;
  scoreGlobal: number;
  quadrant: QuadrantPosition;
  evaluatorCount: number;
}

export interface RankedProject extends ProjectScores {
  rank: number;
}

export type QuadrantPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
