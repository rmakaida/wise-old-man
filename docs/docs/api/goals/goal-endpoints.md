---
title: 'Goal Endpoints'
sidebar_position: 2
---

## Get Player Goals

`GET /players/{username}/goals`

Returns all goals for a player. Optionally filter by status.

**Query Params**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| status | string | `false` | Filter by status: `active`, `completed`, or `expired` |

**Example Request**

```curl
curl -X GET https://api.wiseoldman.net/v2/players/Psikoi/goals?status=active \
  -H "Content-Type: application/json"
```

**Example Response**

```json
[
  {
    "id": 1,
    "playerId": 1234,
    "metric": "attack",
    "measure": "experience",
    "targetValue": 13034431,
    "currentValue": 8500000,
    "progress": 0.652,
    "status": "active",
    "deadline": "2025-12-31T23:59:59.000Z",
    "completedAt": null,
    "title": "Reach 99 Attack",
    "description": null,
    "groupId": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-06-01T00:00:00.000Z"
  }
]
```

---

## Create Player Goal

`POST /players/{username}/goals`

Creates a new goal for the player. The `currentValue` is automatically read from the player's latest snapshot.

**Request Body**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| metric | string | `true` | A valid metric (skill, boss, or activity name) |
| targetValue | integer | `true` | Must be greater than the player's current value |
| deadline | datetime | `false` | Optional ISO 8601 deadline, must be in the future |
| title | string | `false` | Custom title (max 100 chars) |
| description | string | `false` | Custom description (max 500 chars) |

**Constraints**
- A player can have at most **10 active goals** at a time.
- `targetValue` must be greater than the player's current snapshot value for that metric.

**Example Request**

```curl
curl -X POST https://api.wiseoldman.net/v2/players/Psikoi/goals \
  -H "Content-Type: application/json" \
  -d '{
    "metric": "attack",
    "targetValue": 13034431,
    "deadline": "2025-12-31T23:59:59Z",
    "title": "Reach 99 Attack"
  }'
```

---

## Update Player Goal

`PATCH /players/{username}/goals/{id}`

Updates the title, description, or deadline of an **active** goal. The metric and targetValue cannot be changed.

**Request Body**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| title | string | `false` | New title (max 100 chars) |
| description | string | `false` | New description (max 500 chars) |
| deadline | datetime \| null | `false` | New deadline (must be in future), or `null` to remove |

---

## Delete Player Goal

`DELETE /players/{username}/goals/{id}`

Permanently deletes a goal.

---

## Get Player Milestones

`GET /players/{username}/milestones`

Returns all milestones achieved by the player, ordered by most recent first.

Milestones are automatically tracked when a player's stats are updated. Predefined thresholds:
- **Skills:** 50, 70, 85, 90, 99 (13,034,431 xp), and 200 (200,000,000 xp)
- **Bosses:** 100, 500, 1,000, 5,000, 10,000 kills

**Example Request**

```curl
curl -X GET https://api.wiseoldman.net/v2/players/Psikoi/milestones \
  -H "Content-Type: application/json"
```

---

## Get Group Goals

`GET /groups/{id}/goals`

Returns all goals belonging to a group, with player information embedded. Optionally filter by status.

**Query Params**

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| status | string | `false` | Filter by `active`, `completed`, or `expired` |

---

## Get Group Milestones

`GET /groups/{id}/milestones`

Returns all milestones achieved by members of the group, ordered by most recently achieved. Includes player information for each milestone.

**Example Request**

```curl
curl -X GET https://api.wiseoldman.net/v2/groups/139/milestones \
  -H "Content-Type: application/json"
```
