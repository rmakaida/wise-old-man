import { Boss, BOSSES, Metric, Skill, SKILLS } from '../../../types';
import { isActivity, isBoss, isSkill } from '../../../utils/shared/metric.utils';

export const MAX_ACTIVE_GOALS = 10;

export const SKILL_EXP_AT_LEVEL: Record<number, bigint> = {
  50: BigInt(101_333),
  70: BigInt(737_627),
  85: BigInt(3_258_594),
  90: BigInt(5_346_332),
  99: BigInt(13_034_431),
  200: BigInt(200_000_000)
};

export const BOSS_KILL_MILESTONES: bigint[] = [BigInt(100), BigInt(500), BigInt(1000), BigInt(5000), BigInt(10000)];

export type GoalMeasure = 'experience' | 'kills' | 'score';

export function getGoalMeasure(metric: Metric): GoalMeasure {
  if (isSkill(metric)) return 'experience';
  if (isBoss(metric)) return 'kills';
  return 'score';
}

export function getMilestoneThresholds(metric: Metric): bigint[] {
  if (isSkill(metric)) {
    return Object.values(SKILL_EXP_AT_LEVEL);
  }
  if (isBoss(metric)) {
    return BOSS_KILL_MILESTONES;
  }
  // activities: no predefined milestones
  return [];
}

export const ALL_MILESTONE_METRICS: Metric[] = [
  ...(SKILLS.filter(s => s !== Skill.OVERALL) as Metric[]),
  ...(BOSSES as Metric[])
];
