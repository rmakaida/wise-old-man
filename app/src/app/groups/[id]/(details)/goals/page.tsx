"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GoalStatus, GoalResponse, MilestoneResponse, MetricProps } from "@wise-old-man/utils";
import { useWOMClient } from "~/hooks/useWOMClient";
import { GoalList } from "~/components/players/GoalList";

interface PageProps {
  params: { id: number };
}

interface GoalWithPlayer extends GoalResponse {
  player?: { id: number; username: string; displayName: string };
}

interface MilestoneWithPlayer extends MilestoneResponse {
  player?: { id: number; username: string; displayName: string };
}

interface MemberSummary {
  username: string;
  displayName: string;
  total: number;
  active: number;
  completed: number;
  avgProgress: number;
}

export default function GroupGoalsPage({ params }: PageProps) {
  const groupId = Number(params.id);
  const client = useWOMClient();

  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("active");
  const [view, setView] = useState<"members" | "goals" | "milestones">("members");

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["groupGoals", groupId],
    queryFn: () => client.goals.getGroupGoals(groupId) as Promise<GoalWithPlayer[]>,
  });

  const { data: groupMilestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ["groupMilestones", groupId],
    queryFn: () => client.goals.getGroupMilestones(groupId) as Promise<MilestoneWithPlayer[]>,
  });

  const displayedGoals: GoalWithPlayer[] =
    statusFilter === "all" ? goals : goals.filter((g) => g.status === statusFilter);

  // Aggregate goals by member
  const memberMap = new Map<string, MemberSummary>();
  for (const goal of goals) {
    const p = goal.player;
    if (!p) continue;
    if (!memberMap.has(p.username)) {
      memberMap.set(p.username, {
        username: p.username,
        displayName: p.displayName,
        total: 0,
        active: 0,
        completed: 0,
        avgProgress: 0,
      });
    }
    const m = memberMap.get(p.username)!;
    m.total++;
    if (goal.status === "active") m.active++;
    if (goal.status === "completed") m.completed++;
  }
  for (const [username, summary] of memberMap.entries()) {
    const mg = goals.filter((g) => g.player?.username === username);
    summary.avgProgress =
      mg.length > 0
        ? Math.round((mg.reduce((s, g) => s + g.progress, 0) / mg.length) * 100)
        : 0;
  }
  const members = Array.from(memberMap.values()).sort((a, b) => b.avgProgress - a.avgProgress);

  return (
    <div className="mt-7">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-white">Group Goals</h2>
          <p className="text-sm text-gray-400">
            {goals.length} goals · {members.length} members · {groupMilestones.length} milestones achieved
          </p>
        </div>

        {/* View toggle */}
        <div className="flex overflow-hidden rounded-lg border border-gray-600">
          {(["members", "goals", "milestones"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm capitalize transition-colors ${
                view === v
                  ? "bg-gray-200 font-medium text-gray-900"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "members" && (
        isLoading ? <LoadingState /> : <MemberProgressTable members={members} />
      )}

      {view === "goals" && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["all", "active", "completed", "expired"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-sm capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-gray-200 font-medium text-gray-900"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {isLoading ? <LoadingState /> : (
            <GoalList goals={displayedGoals} emptyMessage="No group goals found." />
          )}
        </>
      )}

      {view === "milestones" && (
        milestonesLoading ? <LoadingState /> : (
          <GroupMilestonesTable milestones={groupMilestones} />
        )
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center rounded-lg border border-gray-600 bg-gray-800 px-4 py-10">
      <span className="text-sm text-gray-400">Loading...</span>
    </div>
  );
}

function MemberProgressTable({ members }: { members: MemberSummary[] }) {
  if (members.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-600 bg-gray-800 px-4 py-10">
        <span className="text-sm text-gray-400">No group goals found.</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-600">
      <table className="w-full text-sm">
        <thead className="bg-gray-700 text-left text-xs uppercase tracking-wide text-gray-400">
          <tr>
            <th className="px-4 py-3">Member</th>
            <th className="px-4 py-3 text-center">Total</th>
            <th className="px-4 py-3 text-center">Active</th>
            <th className="px-4 py-3 text-center">Completed</th>
            <th className="px-4 py-3">Avg progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {members.map((m) => (
            <tr key={m.username} className="bg-gray-800 transition-colors">
              <td className="px-4 py-3 font-medium text-white">{m.displayName}</td>
              <td className="px-4 py-3 text-center text-gray-300">{m.total}</td>
              <td className="px-4 py-3 text-center text-blue-400">{m.active}</td>
              <td className="px-4 py-3 text-center text-green-400">{m.completed}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-x-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-700">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${m.avgProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{m.avgProgress}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupMilestonesTable({ milestones }: { milestones: MilestoneWithPlayer[] }) {
  if (milestones.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-600 bg-gray-800 px-4 py-10">
        <span className="text-sm text-gray-400">No group milestones achieved yet.</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-600">
      <table className="w-full text-sm">
        <thead className="bg-gray-700 text-left text-xs uppercase tracking-wide text-gray-400">
          <tr>
            <th className="px-4 py-3">Member</th>
            <th className="px-4 py-3">Metric</th>
            <th className="px-4 py-3 text-right">Value</th>
            <th className="px-4 py-3 text-right">Achieved</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {milestones.map((m) => {
            const metricName =
              m.metric in MetricProps
                ? MetricProps[m.metric as keyof typeof MetricProps].name
                : m.metric;
            return (
              <tr key={m.id} className="bg-gray-800 transition-colors">
                <td className="px-4 py-3 font-medium text-white">
                  {m.player?.displayName ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-300">{metricName}</td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {m.milestoneValue.toLocaleString()} {m.measure}
                </td>
                <td className="px-4 py-3 text-right text-gray-400 text-xs">
                  {new Date(m.achievedAt).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
