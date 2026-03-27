import prisma from '../../prisma';
import { GoalStatus } from '../../types';
import { JobHandler } from '../types/job-handler.type';

export const ExpirePlayerGoalsJobHandler: JobHandler<unknown> = {
  async execute() {
    await prisma.goal.updateMany({
      where: {
        status: GoalStatus.ACTIVE,
        deadline: { lt: new Date() }
      },
      data: { status: GoalStatus.EXPIRED }
    });
  }
};
