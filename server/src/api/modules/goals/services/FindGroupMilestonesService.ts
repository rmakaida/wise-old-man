import prisma from '../../../../prisma';
import { NotFoundError } from '../../../errors';

async function findGroupMilestones(groupId: number) {
  const group = await prisma.group.findFirst({
    where: { id: groupId }
  });

  if (!group) {
    throw new NotFoundError('Group not found.');
  }

  // Get all player IDs in the group
  const memberships = await prisma.membership.findMany({
    where: { groupId },
    select: { playerId: true }
  });

  const playerIds = memberships.map(m => m.playerId);

  if (playerIds.length === 0) return [];

  const milestones = await prisma.playerMilestone.findMany({
    where: { playerId: { in: playerIds } },
    include: {
      player: {
        select: { id: true, username: true, displayName: true }
      }
    },
    orderBy: { achievedAt: 'desc' }
  });

  return milestones;
}

export { findGroupMilestones };
