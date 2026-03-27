import prisma from '../../prisma';
import { GoalStatus, Metric, METRICS } from '../../types';
import { getMetricValueKey } from '../../utils/get-metric-value-key.util';
import { getRequiredSnapshotFields } from '../../utils/get-required-snapshot-fields.util';
import { ALL_MILESTONE_METRICS, getMilestoneThresholds } from '../../api/modules/goals/goal.utils';
import { JobHandler, JobHandlerContext } from '../types/job-handler.type';
import { JobType } from '../types/job-type.enum';

interface Payload {
  username: string;
}

export const SyncPlayerGoalsJobHandler: JobHandler<Payload> = {
  options: {
    maxConcurrent: 2
  },

  generateUniqueJobId(payload) {
    return `sync-goals-${payload.username}`;
  },

  async execute(payload, context: JobHandlerContext) {
    const player = await prisma.player.findFirst({
      where: { username: payload.username },
      include: {
        latestSnapshot: {
          select: {
            playerId: true,
            createdAt: true,
            ...getRequiredSnapshotFields(METRICS)
          }
        }
      }
    });

    if (!player || !player.latestSnapshot) {
      return;
    }

    const snapshot = player.latestSnapshot;
    const playerId = player.id;

    // --- Sync goal progress ---
    const activeGoals = await prisma.goal.findMany({
      where: { playerId, status: GoalStatus.ACTIVE }
    });

    for (const goal of activeGoals) {
      const rawValue = snapshot[getMetricValueKey(goal.metric as (typeof METRICS)[number])] as number;
      const newValue = BigInt(rawValue < 0 ? 0 : rawValue);

      if (newValue === goal.currentValue) {
        continue;
      }

      if (newValue >= goal.targetValue) {
        await prisma.goal.update({
          where: { id: goal.id },
          data: {
            currentValue: newValue,
            status: GoalStatus.COMPLETED,
            completedAt: snapshot.createdAt
          }
        });

        context.jobManager.add(JobType.DISPATCH_GOAL_COMPLETED_DISCORD_EVENT, {
          playerId,
          goalId: goal.id
        });
      } else {
        await prisma.goal.update({
          where: { id: goal.id },
          data: { currentValue: newValue }
        });
      }
    }

    // --- Sync milestones ---
    const existingMilestones = await prisma.playerMilestone.findMany({
      where: { playerId },
      select: { metric: true, milestoneValue: true }
    });

    const existingSet = new Set(existingMilestones.map(m => `${m.metric}:${m.milestoneValue}`));

    const newMilestones: Array<{
      playerId: number;
      metric: Metric;
      milestoneValue: bigint;
      achievedAt: Date;
    }> = [];

    for (const metric of ALL_MILESTONE_METRICS) {
      const rawValue = snapshot[getMetricValueKey(metric)] as number;
      if (rawValue <= 0) continue;

      const value = BigInt(rawValue);
      const thresholds = getMilestoneThresholds(metric);

      for (const threshold of thresholds) {
        if (value >= threshold && !existingSet.has(`${metric}:${threshold}`)) {
          newMilestones.push({
            playerId,
            metric,
            milestoneValue: threshold,
            achievedAt: snapshot.createdAt
          });
        }
      }
    }

    if (newMilestones.length > 0) {
      await prisma.playerMilestone.createMany({
        data: newMilestones,
        skipDuplicates: true
      });

      for (const m of newMilestones) {
        context.jobManager.add(JobType.DISPATCH_MILESTONE_ACHIEVED_DISCORD_EVENT, {
          playerId,
          metric: m.metric,
          milestoneValue: m.milestoneValue.toString()
        });
      }
    }
  }
};
