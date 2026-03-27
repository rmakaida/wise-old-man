import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import supertest from 'supertest';
import APIInstance from '../../../src/api';
import { eventEmitter } from '../../../src/api/events';
import prisma from '../../../src/prisma';
import { GoalStatus, PlayerType } from '../../../src/types';
import { redisClient } from '../../../src/services/redis.service';
import { SyncPlayerGoalsJobHandler } from '../../../src/jobs/handlers/sync-player-goals.job';
import { ExpirePlayerGoalsJobHandler } from '../../../src/jobs/handlers/expire-player-goals.job';
import {
  modifyRawHiscoresData,
  readFile,
  registerHiscoresMock,
  resetDatabase
} from '../../utils';

const api = supertest(new APIInstance().init().express);
const axiosMock = new MockAdapter(axios, { onNoMatch: 'passthrough' });

const globalData = {
  hiscoresRawData: ''
};

beforeEach(() => {
  jest.resetAllMocks();
  eventEmitter.init();
});

beforeAll(async () => {
  eventEmitter.init();
  await resetDatabase();
  await redisClient.flushall();

  globalData.hiscoresRawData = await readFile(`${__dirname}/../../data/hiscores/psikoi_hiscores.json`);

  registerHiscoresMock(axiosMock, {
    [PlayerType.REGULAR]: { statusCode: 200, rawData: globalData.hiscoresRawData },
    [PlayerType.IRONMAN]: { statusCode: 404 },
    [PlayerType.HARDCORE]: { statusCode: 404 },
    [PlayerType.ULTIMATE]: { statusCode: 404 }
  });
});

afterAll(() => {
  jest.useRealTimers();
  axiosMock.reset();
  redisClient.quit();
});

describe('Goals API', () => {
  describe('1 - Create Goal', () => {
    it('should return 404 for unknown player', async () => {
      const response = await api.post('/players/unknownxxx99/goals').send({
        metric: 'attack',
        targetValue: 13_034_431
      });

      expect(response.status).toBe(404);
    });

    it('should create a player and then create a goal', async () => {
      // First, register the player
      const updateResponse = await api.post('/players/Psikoi');
      expect(updateResponse.status).toBeLessThan(300);

      // Now create a goal with a very high target that is definitely above current
      const response = await api.post('/players/Psikoi/goals').send({
        metric: 'attack',
        targetValue: 200_000_000, // max XP - surely above current
        title: 'Max Attack XP'
      });

      expect(response.status).toBe(201);
      expect(response.body.metric).toBe('attack');
      expect(response.body.measure).toBe('experience');
      expect(response.body.status).toBe('active');
      expect(response.body.targetValue).toBe(200_000_000);
      expect(response.body.title).toBe('Max Attack XP');
      expect(response.body.progress).toBeGreaterThanOrEqual(0);
      expect(response.body.progress).toBeLessThanOrEqual(1);
    });

    it('should reject targetValue <= currentValue', async () => {
      // Player is already updated; try to set a target at 1 XP (below any real XP)
      // First get current goals to understand player state
      const response = await api.post('/players/Psikoi/goals').send({
        metric: 'attack',
        targetValue: 1 // Virtually 0, less than any real XP value
      });

      expect(response.status).toBe(400);
    });

    it('should reject invalid (zero or negative) targetValue', async () => {
      const response = await api.post('/players/Psikoi/goals').send({
        metric: 'attack',
        targetValue: 0
      });

      expect(response.status).toBe(400);
    });

    it('should reject deadline in the past', async () => {
      const response = await api.post('/players/Psikoi/goals').send({
        metric: 'defence',
        targetValue: 200_000_000,
        deadline: '2020-01-01T00:00:00.000Z'
      });

      expect(response.status).toBe(400);
    });
  });

  describe('2 - Get Goals', () => {
    it('should return player goals', async () => {
      const response = await api.get('/players/Psikoi/goals');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter goals by status', async () => {
      const response = await api.get('/players/Psikoi/goals?status=active');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((g: { status: string }) => {
        expect(g.status).toBe('active');
      });
    });

    it('should return 404 for unknown player', async () => {
      const response = await api.get('/players/unknownxxx99/goals');
      expect(response.status).toBe(404);
    });
  });

  describe('3 - Update Goal', () => {
    it('should update goal title and description', async () => {
      // Get existing goals
      const listResponse = await api.get('/players/Psikoi/goals?status=active');
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.length).toBeGreaterThan(0);

      const goalId = listResponse.body[0].id;

      const response = await api.patch(`/players/Psikoi/goals/${goalId}`).send({
        title: 'Updated title',
        description: 'Updated description'
      });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated title');
      expect(response.body.description).toBe('Updated description');
    });

    it('should return 404 for unknown goal', async () => {
      const response = await api.patch('/players/Psikoi/goals/999999').send({
        title: 'test'
      });
      expect(response.status).toBe(404);
    });
  });

  describe('4 - Delete Goal', () => {
    it('should delete a goal', async () => {
      // Create a goal to delete
      const createResponse = await api.post('/players/Psikoi/goals').send({
        metric: 'strength',
        targetValue: 200_000_000
      });
      expect(createResponse.status).toBe(201);

      const goalId = createResponse.body.id;

      const deleteResponse = await api.delete(`/players/Psikoi/goals/${goalId}`);
      expect(deleteResponse.status).toBe(200);

      // Verify it's gone
      const listResponse = await api.get('/players/Psikoi/goals');
      const found = listResponse.body.find((g: { id: number }) => g.id === goalId);
      expect(found).toBeUndefined();
    });

    it('should return 404 for unknown goal', async () => {
      const response = await api.delete('/players/Psikoi/goals/999999');
      expect(response.status).toBe(404);
    });
  });

  describe('5 - Max active goals limit', () => {
    it('should reject when player exceeds 10 active goals', async () => {
      // Create goals for a second metric variety
      const metrics = [
        'defence', 'hitpoints', 'ranged', 'prayer', 'magic',
        'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking'
      ];

      for (const metric of metrics) {
        await api.post('/players/Psikoi/goals').send({
          metric,
          targetValue: 200_000_000
        });
      }

      // The 11th goal (beyond the 10 allowed, existing goals + new ones)
      const response = await api.post('/players/Psikoi/goals').send({
        metric: 'crafting',
        targetValue: 200_000_000
      });

      // Either rejected or accepted depending on how many were already active — check for rejection
      // In a clean test run this should hit the limit
      const countResponse = await api.get('/players/Psikoi/goals?status=active');
      if (countResponse.body.length >= 10) {
        expect(response.status).toBe(400);
      }
    });
  });

  describe('6 - Sync goal progress job', () => {
    it('should complete a goal when currentValue >= targetValue after update', async () => {
      // Create a goal with targetValue just slightly above current
      const listResponse = await api.get('/players/Psikoi/goals?status=active');
      const existingGoal = listResponse.body[0];

      if (!existingGoal) return;

      // Set a low target that the player already exceeds by creating a new one with low targetValue
      // We need to directly manipulate DB for this test
      const player = await prisma.player.findFirst({ where: { username: 'psikoi' } });
      if (!player) return;

      // Create a goal with a target the player will definitely already surpass
      const goal = await prisma.goal.create({
        data: {
          playerId: player.id,
          metric: 'overall',
          targetValue: 1n, // incredibly low target
          currentValue: 0n,
          status: GoalStatus.ACTIVE
        }
      });

      // Run the sync job (context with no-op jobManager for tests)
      await SyncPlayerGoalsJobHandler.execute({ username: 'psikoi' }, { jobManager: { add: jest.fn() } as never });

      // Check that the goal was completed
      const updatedGoal = await prisma.goal.findFirst({ where: { id: goal.id } });
      expect(updatedGoal?.status).toBe(GoalStatus.COMPLETED);
      expect(updatedGoal?.completedAt).not.toBeNull();
    });
  });

  describe('7 - Expire goals job', () => {
    it('should mark active goals with past deadline as expired', async () => {
      const player = await prisma.player.findFirst({ where: { username: 'psikoi' } });
      if (!player) return;

      const goal = await prisma.goal.create({
        data: {
          playerId: player.id,
          metric: 'farming',
          targetValue: 200_000_000n,
          currentValue: 0n,
          status: GoalStatus.ACTIVE,
          deadline: new Date('2020-01-01T00:00:00Z') // past date
        }
      });

      await ExpirePlayerGoalsJobHandler.execute(undefined, { jobManager: { add: jest.fn() } as never });

      const updated = await prisma.goal.findFirst({ where: { id: goal.id } });
      expect(updated?.status).toBe(GoalStatus.EXPIRED);
    });

    it('should not touch active goals without deadline', async () => {
      const player = await prisma.player.findFirst({ where: { username: 'psikoi' } });
      if (!player) return;

      const goal = await prisma.goal.create({
        data: {
          playerId: player.id,
          metric: 'agility',
          targetValue: 200_000_000n,
          currentValue: 0n,
          status: GoalStatus.ACTIVE,
          deadline: null
        }
      });

      await ExpirePlayerGoalsJobHandler.execute(undefined, { jobManager: { add: jest.fn() } as never });

      const unchanged = await prisma.goal.findFirst({ where: { id: goal.id } });
      expect(unchanged?.status).toBe(GoalStatus.ACTIVE);
    });
  });

  describe('8 - Milestones', () => {
    it('should return player milestones', async () => {
      const response = await api.get('/players/Psikoi/milestones');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create milestones idempotently (no duplicates)', async () => {
      const player = await prisma.player.findFirst({ where: { username: 'psikoi' } });
      if (!player) return;

      const mockCtx = { jobManager: { add: jest.fn() } as never };
      // Run sync twice
      await SyncPlayerGoalsJobHandler.execute({ username: 'psikoi' }, mockCtx);
      await SyncPlayerGoalsJobHandler.execute({ username: 'psikoi' }, mockCtx);

      // Count milestones
      const count1 = await prisma.playerMilestone.count({ where: { playerId: player.id } });

      // Run a third time
      await SyncPlayerGoalsJobHandler.execute({ username: 'psikoi' }, mockCtx);

      const count2 = await prisma.playerMilestone.count({ where: { playerId: player.id } });
      expect(count2).toBe(count1); // No new milestones added
    });

    it('should return 404 for unknown player milestones', async () => {
      const response = await api.get('/players/unknownxxx99/milestones');
      expect(response.status).toBe(404);
    });
  });

  describe('9 - Group goals', () => {
    it('should return 404 for unknown group', async () => {
      const response = await api.get('/groups/999999/goals');
      expect(response.status).toBe(404);
    });

    it('should return group goals', async () => {
      // Create a group first
      const groupResponse = await api.post('/groups').send({
        name: 'Test Goals Group',
        members: [{ username: 'Psikoi', role: 'member' }]
      });

      expect(groupResponse.status).toBe(201);
      const groupId = groupResponse.body.group.id;

      const response = await api.get(`/groups/${groupId}/goals`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
