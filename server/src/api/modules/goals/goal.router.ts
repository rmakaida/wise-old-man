import { Router } from 'express';
import { z } from 'zod';
import { GOAL_STATUSES, GoalStatus, Metric, METRICS } from '../../../types';
import { NotFoundErrorZ } from '../../errors';
import {
  formatGoalResponse,
  formatMilestoneResponse
} from '../../responses';
import { executeRequest, validateRequest } from '../../util/routing';
import { createGoal } from './services/CreateGoalService';
import { deleteGoal } from './services/DeleteGoalService';
import { findGroupGoals } from './services/FindGroupGoalsService';
import { findGroupMilestones } from './services/FindGroupMilestonesService';
import { findPlayerGoals } from './services/FindPlayerGoalsService';
import { findPlayerMilestones } from './services/FindPlayerMilestonesService';
import { updateGoal } from './services/UpdateGoalService';

const router = Router();

// GET /players/:username/goals
router.get(
  '/players/:username/goals',
  validateRequest({
    params: z.object({ username: z.string() }),
    query: z.object({
      status: z.enum(GOAL_STATUSES as [GoalStatus, ...GoalStatus[]]).optional()
    })
  }),
  executeRequest(async (req, res) => {
    const { username } = req.params;
    const { status } = req.query;

    const goals = await findPlayerGoals(username, status);
    res.status(200).json(goals.map(formatGoalResponse));
  })
);

// POST /players/:username/goals
router.post(
  '/players/:username/goals',
  validateRequest({
    params: z.object({ username: z.string() }),
    body: z.object({
      metric: z.enum(METRICS as [Metric, ...Metric[]]),
      targetValue: z.number().int().positive(),
      deadline: z.string().datetime().optional(),
      title: z.string().min(1).max(100).optional(),
      description: z.string().min(1).max(500).optional()
    })
  }),
  executeRequest(async (req, res) => {
    const { username } = req.params;
    const { metric, targetValue, deadline, title, description } = req.body;

    const goal = await createGoal(username, {
      metric,
      targetValue: BigInt(targetValue),
      deadline: deadline ? new Date(deadline) : undefined,
      title,
      description
    });

    res.status(201).json(formatGoalResponse(goal));
  })
);

// PATCH /players/:username/goals/:id
router.patch(
  '/players/:username/goals/:id',
  validateRequest({
    params: z.object({
      username: z.string(),
      id: z.coerce.number().int().positive()
    }),
    body: z.object({
      title: z.string().min(1).max(100).optional(),
      description: z.string().min(1).max(500).optional(),
      deadline: z.string().datetime().nullable().optional()
    })
  }),
  executeRequest(async (req, res) => {
    const { username, id } = req.params;
    const { title, description, deadline } = req.body;

    const goal = await updateGoal(username, id, {
      title,
      description,
      deadline: deadline === null ? null : deadline ? new Date(deadline) : undefined
    });

    res.status(200).json(formatGoalResponse(goal));
  })
);

// DELETE /players/:username/goals/:id
router.delete(
  '/players/:username/goals/:id',
  validateRequest({
    params: z.object({
      username: z.string(),
      id: z.coerce.number().int().positive()
    })
  }),
  executeRequest(async (req, res) => {
    const { username, id } = req.params;
    await deleteGoal(username, id);
    res.status(200).json({});
  })
);

// GET /players/:username/milestones
router.get(
  '/players/:username/milestones',
  validateRequest({
    params: z.object({ username: z.string() })
  }),
  executeRequest(async (req, res) => {
    const { username } = req.params;

    const milestones = await findPlayerMilestones(username);
    res.status(200).json(milestones.map(formatMilestoneResponse));
  })
);

// GET /groups/:id/goals
router.get(
  '/groups/:id/goals',
  validateRequest({
    params: z.object({ id: z.coerce.number().int().positive() }),
    query: z.object({
      status: z.enum(GOAL_STATUSES as [GoalStatus, ...GoalStatus[]]).optional()
    })
  }),
  executeRequest(async (req, res) => {
    const { id } = req.params;
    const { status } = req.query;

    const goals = await findGroupGoals(id, status);
    res.status(200).json(goals.map(g => ({
      ...formatGoalResponse(g),
      player: (g as typeof g & { player?: unknown }).player
    })));
  })
);

// GET /groups/:id/milestones
router.get(
  '/groups/:id/milestones',
  validateRequest({
    params: z.object({ id: z.coerce.number().int().positive() })
  }),
  executeRequest(async (req, res) => {
    const { id } = req.params;

    const milestones = await findGroupMilestones(id);
    res.status(200).json(milestones.map(m => ({
      ...formatMilestoneResponse(m),
      player: (m as typeof m & { player?: unknown }).player
    })));
  })
);

export default router;
