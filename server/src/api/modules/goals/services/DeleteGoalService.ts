import prisma from '../../../../prisma';
import { NotFoundError } from '../../../errors';
import { standardizeUsername } from '../../players/player.utils';

async function deleteGoal(username: string, goalId: number) {
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

  await prisma.goal.delete({ where: { id: goalId } });
}

export { deleteGoal };
