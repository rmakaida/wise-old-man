import { Goal, GoalStatus, Metric, PlayerMilestone } from '../../types';
import { getGoalMeasure, GoalMeasure } from '../modules/goals/goal.utils';

export interface GoalResponse {
  id: number;
  playerId: number;
  metric: Metric;
  measure: GoalMeasure;
  targetValue: number;
  currentValue: number;
  progress: number;
  status: GoalStatus;
  deadline: Date | null;
  completedAt: Date | null;
  title: string | null;
  description: string | null;
  groupId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MilestoneResponse {
  id: number;
  playerId: number;
  metric: Metric;
  measure: GoalMeasure;
  milestoneValue: number;
  achievedAt: Date;
}

export function formatGoalResponse(goal: Goal): GoalResponse {
  const targetValue = Number(goal.targetValue);
  const currentValue = Number(goal.currentValue);

  return {
    id: goal.id,
    playerId: goal.playerId,
    metric: goal.metric as Metric,
    measure: getGoalMeasure(goal.metric as Metric),
    targetValue,
    currentValue,
    progress: targetValue > 0 ? Math.min(currentValue / targetValue, 1) : 0,
    status: goal.status as GoalStatus,
    deadline: goal.deadline,
    completedAt: goal.completedAt,
    title: goal.title,
    description: goal.description,
    groupId: goal.groupId,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt
  };
}

export function formatMilestoneResponse(milestone: PlayerMilestone): MilestoneResponse {
  return {
    id: milestone.id,
    playerId: milestone.playerId,
    metric: milestone.metric as Metric,
    measure: getGoalMeasure(milestone.metric as Metric),
    milestoneValue: Number(milestone.milestoneValue),
    achievedAt: milestone.achievedAt
  };
}
