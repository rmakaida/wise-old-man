import { GoalStatus } from './goal-status.enum';
import { Metric } from './metric.enum';

export interface Goal {
  id: number;
  playerId: number;
  metric: Metric;
  targetValue: bigint;
  currentValue: bigint;
  status: GoalStatus;
  deadline: Date | null;
  completedAt: Date | null;
  title: string | null;
  description: string | null;
  groupId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerMilestone {
  id: number;
  playerId: number;
  metric: Metric;
  milestoneValue: bigint;
  achievedAt: Date;
}
