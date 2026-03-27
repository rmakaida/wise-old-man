import { isErrored } from '@attio/fetchable';
import prisma from '../../prisma';
import { DiscordBotEventType, dispatchDiscordBotEvent } from '../../services/discord.service';
import { JobHandler } from '../types/job-handler.type';

interface Payload {
  playerId: number;
  metric: string;
  milestoneValue: string;
}

export const DispatchMilestoneAchievedDiscordEventJobHandler: JobHandler<Payload> = {
  options: {
    backoff: {
      type: 'exponential',
      delay: 30_000
    }
  },

  async execute(payload) {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const player = await prisma.player.findFirst({
      where: { id: payload.playerId }
    });

    if (!player) return;

    const memberships = await prisma.membership.findMany({
      where: { playerId: player.id },
      select: { groupId: true }
    });

    if (memberships.length === 0) return;

    for (const { groupId } of memberships) {
      const dispatchResult = await dispatchDiscordBotEvent(DiscordBotEventType.MILESTONE_ACHIEVED, {
        groupId,
        player,
        metric: payload.metric,
        milestoneValue: Number(payload.milestoneValue)
      });

      if (isErrored(dispatchResult) && dispatchResult.error.code === 'FAILED_TO_SEND_DISCORD_BOT_EVENT') {
        throw dispatchResult.error;
      }
    }
  }
};
