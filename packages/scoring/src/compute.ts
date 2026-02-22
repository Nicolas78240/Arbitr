import { CriterionScore, ProjectScoreInput, ProjectScores, RankedProject, QuadrantPosition } from './types.js';

/**
 * Compute average of an array of numbers.
 * Null/undefined values (N/P abstentions) are filtered out before computing.
 * If all values are null or the array is empty, returns 0.
 */
export function average(values: (number | null | undefined)[]): number {
  const nonNull = values.filter((v): v is number => v != null);
  if (nonNull.length === 0) return 0;
  return nonNull.reduce((sum, v) => sum + v, 0) / nonNull.length;
}

/**
 * Compute weighted score for one axis.
 * Formula: Σ(avg(criterion_values) × weight) / Σ(weights)
 * Criteria where all evaluator scores are null (N/P) are excluded from
 * the weighted calculation entirely.
 */
export function computeAxisScore(criteria: CriterionScore[]): number {
  if (criteria.length === 0) return 0;

  // Only include criteria that have at least one non-null score
  const activeCriteria = criteria.filter((c) =>
    c.values.some((v) => v != null),
  );

  const totalWeight = activeCriteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = activeCriteria.reduce((sum, c) => {
    const avg = average(c.values);
    return sum + avg * c.weight;
  }, 0);

  return weightedSum / totalWeight;
}

/**
 * Assign a quadrant based on scores and thresholds.
 */
export function assignQuadrant(
  scoreX: number,
  scoreY: number,
  thresholdX: number,
  thresholdY: number,
): QuadrantPosition {
  if (scoreX >= thresholdX && scoreY >= thresholdY) return 'top-right';
  if (scoreX >= thresholdX && scoreY < thresholdY) return 'bottom-right';
  if (scoreX < thresholdX && scoreY >= thresholdY) return 'top-left';
  return 'bottom-left';
}

/**
 * Compute full scores for a single project.
 */
export function computeProjectScores(
  input: ProjectScoreInput,
  thresholdX: number,
  thresholdY: number,
): ProjectScores {
  const xCriteria = input.criteria.filter((c) => c.axis === 'X');
  const yCriteria = input.criteria.filter((c) => c.axis === 'Y');

  const scoreX = computeAxisScore(xCriteria);
  const scoreY = computeAxisScore(yCriteria);
  const scoreGlobal = (scoreX + scoreY) / 2;
  const quadrant = assignQuadrant(scoreX, scoreY, thresholdX, thresholdY);

  // Count unique evaluators (max number of values across criteria)
  const evaluatorCount = Math.max(
    ...input.criteria.map((c) => c.values.length),
    0,
  );

  return {
    projectId: input.projectId,
    projectName: input.projectName,
    teamName: input.teamName,
    number: input.number,
    scoreX,
    scoreY,
    scoreGlobal,
    quadrant,
    evaluatorCount,
  };
}

/**
 * Compute ranking from an array of project scores.
 * Sorted by scoreGlobal descending, rank assigned 1..N.
 */
export function computeRanking(projects: ProjectScores[]): RankedProject[] {
  const sorted = [...projects].sort((a, b) => b.scoreGlobal - a.scoreGlobal);
  return sorted.map((p, index) => ({
    ...p,
    rank: index + 1,
  }));
}
