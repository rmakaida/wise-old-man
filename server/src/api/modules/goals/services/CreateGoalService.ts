import prisma from '../../../../prisma';
import { GoalStatus, Metric } from '../../../../types';
import { getMetricValueKey } from '../../../../utils/get-metric-value-key.util';
import { getRequiredSnapshotFields } from '../../../../utils/get-required-snapshot-fields.util';
import { BadRequestError, NotFoundError } from '../../../errors';
import { standardizeUsername } from '../../players/player.utils';
import { MAX_ACTIVE_GOALS } from '../goal.utils';

interface CreateGoalPayload {
  metric: Metric;
  targetValue: bigint;
  deadline?: Date;
  title?: string;
  description?: string;
}

async function createGoal(username: string, payload: CreateGoalPayload) {
  const player = await prisma.player.findFirst({
    where: { username: standardizeUsername(username) },
    include: {
      latestSnapshot: {
        select: {
          playerId: true,
          createdAt: true,
          ...getRequiredSnapshotFields([payload.metric])
        }
      }
    }
  });

  if (!player) {
    throw new NotFoundError('Player not found.');
  }

  const activeCount = await prisma.goal.count({
    where: { playerId: player.id, status: GoalStatus.ACTIVE }
  });

  if (activeCount >= MAX_ACTIVE_GOALS) {
    throw new BadRequestError(`Players can have at most ${MAX_ACTIVE_GOALS} active goals.`);
  }

  const currentValue = player.latestSnapshot
    ? BigInt(player.latestSnapshot[getMetricValueKey(payload.metric)] as number)
    : 0n;

  if (payload.targetValue <= currentValue) {
    throw new BadRequestError('Target value must be greater than the current value.');
  }

  if (payload.targetValue <= 0n) {
    throw new BadRequestError('Target value must be a positive number.');
  }

  if (payload.deadline && payload.deadline <= new Date()) {
    throw new BadRequestError('Deadline must be in the future.');
  }

  const goal = await prisma.goal.create({
    data: {
      playerId: player.id,
      metric: payload.metric,
      targetValue: payload.targetValue,
      currentValue,
      deadline: payload.deadline ?? null,
      title: payload.title ?? null,
      description: payload.description ?? null
    }
  });

  return goal;
}

export { createGoal };
