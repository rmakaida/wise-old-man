import { GoalResponse, GoalStatus, MilestoneResponse } from '../api-types';
import { CreateGoalPayload, UpdateGoalPayload } from '../api-types';
import BaseAPIClient from './BaseAPIClient';

export default class GoalsClient extends BaseAPIClient {
  /**
   * Gets all goals for a player, optionally filtered by status.
   * @returns A list of goals.
   */
  getPlayerGoals(username: string, params?: { status?: GoalStatus }) {
    return this.getRequest<GoalResponse[]>(`/players/${username}/goals`, params);
  }

  /**
   * Creates a new goal for a player.
   * @returns The created goal.
   */
  createGoal(username: string, body: CreateGoalPayload) {
    return this.postRequest<GoalResponse>(`/players/${username}/goals`, body);
  }

  /**
   * Updates an existing goal (title, description, deadline).
   * @returns The updated goal.
   */
  updateGoal(username: string, goalId: number, body: UpdateGoalPayload) {
    return this.patchRequest<GoalResponse>(`/players/${username}/goals/${goalId}`, body);
  }

  /**
   * Deletes a goal.
   */
  deleteGoal(username: string, goalId: number) {
    return this.deleteRequest<Record<string, never>>(`/players/${username}/goals/${goalId}`);
  }

  /**
   * Gets all achieved milestones for a player.
   * @returns A list of milestones.
   */
  getPlayerMilestones(username: string) {
    return this.getRequest<MilestoneResponse[]>(`/players/${username}/milestones`);
  }

  /**
   * Gets all goals for a group.
   * @returns A list of goals.
   */
  getGroupGoals(groupId: number, params?: { status?: GoalStatus }) {
    return this.getRequest<GoalResponse[]>(`/groups/${groupId}/goals`, params);
  }

  /**
   * Gets all milestones achieved by members of a group.
   * @returns A list of milestones with player info.
   */
  getGroupMilestones(groupId: number) {
    return this.getRequest<MilestoneResponse[]>(`/groups/${groupId}/milestones`);
  }
}
