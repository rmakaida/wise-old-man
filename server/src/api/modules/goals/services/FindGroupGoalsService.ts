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

  const goals = await prisma.goal.findMany({
    where: {
      groupId,
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
