import prisma from '../../../../prisma';
import { GoalStatus } from '../../../../types';
import { BadRequestError, NotFoundError } from '../../../errors';
import { standardizeUsername } from '../../players/player.utils';

interface UpdateGoalPayload {
  title?: string;
  description?: string;
  deadline?: Date | null;
}

async function updateGoal(username: string, goalId: number, payload: UpdateGoalPayload) {
  const player = await prisma.player.findFirst({
    where: { username: standardizeUsername(username) }
  });

  if (!player) {
    throw new NotFoundError('Player not found.');
  }

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, playerId: player.id }
  });

  if (!goal) {
    throw new NotFoundError('Goal not found.');
  }

  if (goal.status !== GoalStatus.ACTIVE) {
    throw new BadRequestError('Only active goals can be edited.');
  }

  if (payload.deadline !== undefined && payload.deadline !== null && payload.deadline <= new Date()) {
    throw new BadRequestError('Deadline must be in the future.');
  }

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: {
      title: payload.title !== undefined ? payload.title : undefined,
      description: payload.description !== undefined ? payload.description : undefined,
      deadline: payload.deadline !== undefined ? payload.deadline : undefined
    }
  });

  return updated;
}

export { updateGoal };
