import { describe, it, expect } from 'vitest';
import { average, computeAxisScore, assignQuadrant, computeProjectScores, computeRanking } from '../compute';
import type { CriterionScore, ProjectScoreInput, ProjectScores } from '../types';

// ---------------------------------------------------------------------------
// average
// ---------------------------------------------------------------------------
describe('average', () => {
  it('returns 0 for an empty array', () => {
    expect(average([])).toBe(0);
  });

  it('returns the value itself for a single-element array', () => {
    expect(average([7])).toBe(7);
  });

  it('computes the mean of multiple values', () => {
    expect(average([2, 4, 6])).toBe(4);
  });

  it('handles decimal values', () => {
    expect(average([1.5, 2.5])).toBe(2);
  });

  it('handles negative values', () => {
    expect(average([-2, 2])).toBe(0);
  });

  it('filters out null values before computing', () => {
    expect(average([2, null, 4, null])).toBe(3);
  });

  it('returns 0 when all values are null', () => {
    expect(average([null, null, null])).toBe(0);
  });

  it('handles a single non-null value among nulls', () => {
    expect(average([null, 5, null])).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// computeAxisScore
// ---------------------------------------------------------------------------
describe('computeAxisScore', () => {
  it('returns 0 for empty criteria', () => {
    expect(computeAxisScore([])).toBe(0);
  });

  it('returns 0 when all weights are zero', () => {
    const criteria: CriterionScore[] = [
      { criterionId: 'c1', axis: 'X', weight: 0, values: [5, 10] },
      { criterionId: 'c2', axis: 'X', weight: 0, values: [3] },
    ];
    expect(computeAxisScore(criteria)).toBe(0);
  });

  it('computes correctly for a single criterion', () => {
    const criteria: CriterionScore[] = [
      { criterionId: 'c1', axis: 'X', weight: 1, values: [4, 6] },
    ];
    // avg = 5, weightedSum = 5 * 1 = 5, totalWeight = 1 => 5 / 1 = 5
    expect(computeAxisScore(criteria)).toBe(5);
  });

  it('computes correctly for multiple criteria with different weights', () => {
    const criteria: CriterionScore[] = [
      { criterionId: 'c1', axis: 'X', weight: 2, values: [10] }, // avg = 10
      { criterionId: 'c2', axis: 'X', weight: 3, values: [5] },  // avg = 5
    ];
    // weightedSum = 10*2 + 5*3 = 20 + 15 = 35
    // totalWeight = 2 + 3 = 5
    // score = 35 / 5 = 7
    expect(computeAxisScore(criteria)).toBe(7);
  });

  it('handles criteria with empty values arrays', () => {
    const criteria: CriterionScore[] = [
      { criterionId: 'c1', axis: 'X', weight: 1, values: [] },
    ];
    // avg of [] = 0, weightedSum = 0*1 = 0, totalWeight = 1 => 0 / 1 = 0
    expect(computeAxisScore(criteria)).toBe(0);
  });

  it('handles a mix of empty and non-empty values', () => {
    const criteria: CriterionScore[] = [
      { criterionId: 'c1', axis: 'X', weight: 1, values: [] },    // no scores — excluded from active criteria
      { criterionId: 'c2', axis: 'X', weight: 1, values: [8, 10] }, // avg = 9
    ];
    // c1 has no non-null values, so it's excluded from active criteria
    // Only c2 contributes: weightedSum = 9*1 = 9, totalWeight = 1 => 9 / 1 = 9
    expect(computeAxisScore(criteria)).toBe(9);
  });

  it('excludes criteria where all values are null (N/P)', () => {
    const criteria: CriterionScore[] = [
      { criterionId: 'c1', axis: 'X', weight: 1, values: [null, null] }, // all N/P — excluded
      { criterionId: 'c2', axis: 'X', weight: 1, values: [8, 10] },     // avg = 9
    ];
    // Only c2 contributes: weightedSum = 9*1 = 9, totalWeight = 1 => 9/1 = 9
    expect(computeAxisScore(criteria)).toBe(9);
  });

  it('handles partial null values in a criterion (some evaluators abstained)', () => {
    const criteria: CriterionScore[] = [
      { criterionId: 'c1', axis: 'X', weight: 1, values: [null, 4, null, 6] }, // avg of non-null = 5
    ];
    expect(computeAxisScore(criteria)).toBe(5);
  });

  it('returns 0 when all criteria have all-null values', () => {
    const criteria: CriterionScore[] = [
      { criterionId: 'c1', axis: 'X', weight: 1, values: [null, null] },
      { criterionId: 'c2', axis: 'X', weight: 2, values: [null] },
    ];
    expect(computeAxisScore(criteria)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// assignQuadrant
// ---------------------------------------------------------------------------
describe('assignQuadrant', () => {
  it('returns top-right when both scores are above thresholds', () => {
    expect(assignQuadrant(8, 8, 5, 5)).toBe('top-right');
  });

  it('returns top-left when X is below and Y is above', () => {
    expect(assignQuadrant(3, 8, 5, 5)).toBe('top-left');
  });

  it('returns bottom-right when X is above and Y is below', () => {
    expect(assignQuadrant(8, 3, 5, 5)).toBe('bottom-right');
  });

  it('returns bottom-left when both scores are below thresholds', () => {
    expect(assignQuadrant(3, 3, 5, 5)).toBe('bottom-left');
  });

  it('returns top-right when scores exactly equal thresholds (>=)', () => {
    expect(assignQuadrant(5, 5, 5, 5)).toBe('top-right');
  });

  it('returns bottom-right when X equals threshold and Y is below', () => {
    expect(assignQuadrant(5, 4, 5, 5)).toBe('bottom-right');
  });

  it('returns top-left when X is below threshold and Y equals threshold', () => {
    expect(assignQuadrant(4, 5, 5, 5)).toBe('top-left');
  });
});

// ---------------------------------------------------------------------------
// computeProjectScores
// ---------------------------------------------------------------------------
describe('computeProjectScores', () => {
  const baseInput: ProjectScoreInput = {
    projectId: 'p1',
    projectName: 'Project Alpha',
    teamName: 'Team A',
    number: 1,
    criteria: [
      { criterionId: 'cx1', axis: 'X', weight: 1, values: [8, 10] },   // avg = 9
      { criterionId: 'cx2', axis: 'X', weight: 1, values: [6, 4] },    // avg = 5
      { criterionId: 'cy1', axis: 'Y', weight: 2, values: [7, 9] },    // avg = 8
      { criterionId: 'cy2', axis: 'Y', weight: 1, values: [3, 3] },    // avg = 3
    ],
  };

  it('computes scoreX from X-axis criteria only', () => {
    const result = computeProjectScores(baseInput, 5, 5);
    // X criteria: cx1 (avg=9, w=1), cx2 (avg=5, w=1)
    // weightedSum = 9*1 + 5*1 = 14, totalWeight = 2 => 14/2 = 7
    expect(result.scoreX).toBe(7);
  });

  it('computes scoreY from Y-axis criteria only', () => {
    const result = computeProjectScores(baseInput, 5, 5);
    // Y criteria: cy1 (avg=8, w=2), cy2 (avg=3, w=1)
    // weightedSum = 8*2 + 3*1 = 19, totalWeight = 3 => 19/3 ≈ 6.333
    expect(result.scoreY).toBeCloseTo(19 / 3);
  });

  it('computes scoreGlobal as the average of scoreX and scoreY', () => {
    const result = computeProjectScores(baseInput, 5, 5);
    expect(result.scoreGlobal).toBeCloseTo((7 + 19 / 3) / 2);
  });

  it('assigns the correct quadrant', () => {
    const result = computeProjectScores(baseInput, 5, 5);
    // scoreX = 7 >= 5, scoreY ≈ 6.33 >= 5 => top-right
    expect(result.quadrant).toBe('top-right');
  });

  it('copies project metadata correctly', () => {
    const result = computeProjectScores(baseInput, 5, 5);
    expect(result.projectId).toBe('p1');
    expect(result.projectName).toBe('Project Alpha');
    expect(result.teamName).toBe('Team A');
    expect(result.number).toBe(1);
  });

  it('computes evaluatorCount as the max number of values across all criteria', () => {
    const result = computeProjectScores(baseInput, 5, 5);
    // All criteria have 2 values
    expect(result.evaluatorCount).toBe(2);
  });

  it('computes evaluatorCount correctly when criteria have different value counts', () => {
    const input: ProjectScoreInput = {
      projectId: 'p2',
      projectName: 'Project Beta',
      teamName: 'Team B',
      number: 2,
      criteria: [
        { criterionId: 'cx1', axis: 'X', weight: 1, values: [5, 6, 7] },
        { criterionId: 'cy1', axis: 'Y', weight: 1, values: [4] },
      ],
    };
    const result = computeProjectScores(input, 5, 5);
    expect(result.evaluatorCount).toBe(3);
  });

  it('handles a project with no criteria', () => {
    const input: ProjectScoreInput = {
      projectId: 'p3',
      projectName: 'Empty',
      teamName: 'Team C',
      number: 3,
      criteria: [],
    };
    const result = computeProjectScores(input, 5, 5);
    expect(result.scoreX).toBe(0);
    expect(result.scoreY).toBe(0);
    expect(result.scoreGlobal).toBe(0);
    expect(result.quadrant).toBe('bottom-left');
    // Math.max(...[], 0) => Math.max(0) => 0  -- with the spread of empty plus the 0 sentinel
    expect(result.evaluatorCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeRanking
// ---------------------------------------------------------------------------
describe('computeRanking', () => {
  function makeProject(id: string, scoreGlobal: number): ProjectScores {
    return {
      projectId: id,
      projectName: `Project ${id}`,
      teamName: `Team ${id}`,
      number: 1,
      scoreX: scoreGlobal,
      scoreY: scoreGlobal,
      scoreGlobal,
      quadrant: 'top-right',
      evaluatorCount: 1,
    };
  }

  it('returns an empty array when given no projects', () => {
    expect(computeRanking([])).toEqual([]);
  });

  it('assigns rank 1 to a single project', () => {
    const result = computeRanking([makeProject('a', 8)]);
    expect(result).toHaveLength(1);
    expect(result[0].rank).toBe(1);
    expect(result[0].projectId).toBe('a');
  });

  it('sorts projects by scoreGlobal descending', () => {
    const projects = [makeProject('low', 3), makeProject('high', 9), makeProject('mid', 6)];
    const result = computeRanking(projects);
    expect(result[0].projectId).toBe('high');
    expect(result[1].projectId).toBe('mid');
    expect(result[2].projectId).toBe('low');
  });

  it('assigns sequential ranks 1, 2, 3, ...', () => {
    const projects = [makeProject('a', 10), makeProject('b', 5), makeProject('c', 1)];
    const result = computeRanking(projects);
    expect(result.map((p) => p.rank)).toEqual([1, 2, 3]);
  });

  it('gives sequential ranks to tied scores (no shared ranks)', () => {
    const projects = [makeProject('a', 7), makeProject('b', 7), makeProject('c', 3)];
    const result = computeRanking(projects);
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
    expect(result[2].rank).toBe(3);
    // Both tied projects should have scoreGlobal 7
    expect(result[0].scoreGlobal).toBe(7);
    expect(result[1].scoreGlobal).toBe(7);
  });

  it('does not mutate the original array', () => {
    const projects = [makeProject('a', 3), makeProject('b', 9)];
    const original = [...projects];
    computeRanking(projects);
    expect(projects[0].projectId).toBe(original[0].projectId);
    expect(projects[1].projectId).toBe(original[1].projectId);
  });
});
