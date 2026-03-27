import prisma from '../../../../prisma';
import { NotFoundError } from '../../../errors';
import { standardizeUsername } from '../../players/player.utils';

async function findPlayerMilestones(username: string) {
  const player = await prisma.player.findFirst({
    where: { username: standardizeUsername(username) }
  });

  if (!player) {
    throw new NotFoundError('Player not found.');
  }

  const milestones = await prisma.playerMilestone.findMany({
    where: { playerId: player.id },
    orderBy: { achievedAt: 'desc' }
  });

  return milestones;
}

export { findPlayerMilestones };
