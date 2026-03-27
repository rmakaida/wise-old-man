export const GoalStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired'
} as const;

export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

export const GOAL_STATUSES = Object.values(GoalStatus) as GoalStatus[];
