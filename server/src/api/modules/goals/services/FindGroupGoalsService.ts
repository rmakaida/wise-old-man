import prisma from '../../../../prisma';
import { GoalStatus } from '../../../../types';
import { NotFoundError } from '../../../errors';

async function findGroupGoals(groupId: number, status?: GoalStatus) {
  const group = await prisma.group.findFirst({
    where: { id: groupId }
  });

  if (!group) {
    throw new NotFoundError('Group not found.');
  }

  const memberships = await prisma.membership.findMany({
    where: { groupId },
    select: { playerId: true }
  });

  const playerIds = memberships.map(m => m.playerId);
  if (playerIds.length === 0) return [];

  const goals = await prisma.goal.findMany({
    where: {
      playerId: { in: playerIds },
      ...(status ? { status } : {})
    },
    include: {
      player: {
        select: { id: true, username: true, displayName: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return goals;
}

export { findGroupGoals };
