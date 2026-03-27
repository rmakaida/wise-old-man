---
title: 'Goal Type Definitions'
sidebar_position: 1
---

## Object: Goal

| Field | Type | Description |
| ----- | ---- | ----------- |
| id | integer | Unique identifier |
| playerId | integer | ID of the player who owns this goal |
| metric | string | The tracked metric (skill, boss, or activity) |
| measure | string | How the metric is measured: `experience`, `kills`, or `score` |
| targetValue | number | The target value to reach |
| currentValue | number | Current value (synced from latest snapshot) |
| progress | number | Completion ratio from 0 to 1 |
| status | string | One of `active`, `completed`, `expired` |
| deadline | datetime \| null | Optional deadline (ISO 8601) |
| completedAt | datetime \| null | When the goal was completed |
| title | string \| null | Optional custom title |
| description | string \| null | Optional custom description |
| groupId | integer \| null | If set, this goal belongs to a group |
| createdAt | datetime | When the goal was created |
| updatedAt | datetime | When the goal was last updated |

## Object: Milestone

| Field | Type | Description |
| ----- | ---- | ----------- |
| id | integer | Unique identifier |
| playerId | integer | ID of the player who achieved this milestone |
| metric | string | The metric for this milestone |
| measure | string | `experience`, `kills`, or `score` |
| milestoneValue | number | The threshold value that was crossed |
| achievedAt | datetime | When the milestone was achieved |
