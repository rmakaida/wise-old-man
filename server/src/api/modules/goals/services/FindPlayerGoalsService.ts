import prisma from '../../../../prisma';
import { GoalStatus } from '../../../../types';
import { NotFoundError } from '../../../errors';
import { standardizeUsername } from '../../players/player.utils';

async function findPlayerGoals(username: string, status?: GoalStatus) {
  const player = await prisma.player.findFirst({
    where: { username: standardizeUsername(username) }
  });

  if (!player) {
    throw new NotFoundError('Player not found.');
  }

  const goals = await prisma.goal.findMany({
    where: {
      playerId: player.id,
      ...(status ? { status } : {})
    },
    orderBy: { createdAt: 'desc' }
  });

  return goals;
}

export { findPlayerGoals };
