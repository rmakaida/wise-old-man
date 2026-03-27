"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GoalStatus } from "@wise-old-man/utils";
import { useWOMClient } from "~/hooks/useWOMClient";
import { GoalList } from "~/components/players/GoalList";
import { GoalProgressChart } from "~/components/players/GoalProgressChart";
import { CreateGoalForm } from "~/components/players/CreateGoalForm";
import { Button } from "~/components/Button";
import { Label } from "~/components/Label";

interface PageProps {
  params: {
    username: string;
  };
}

export default function PlayerGoalsPage({ params }: PageProps) {
  const username = decodeURI(params.username);
  const client = useWOMClient();

  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: allGoals = [], isLoading } = useQuery({
    queryKey: ["playerGoals", username],
    queryFn: () => client.goals.getPlayerGoals(username),
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["playerMilestones", username],
    queryFn: () => client.goals.getPlayerMilestones(username),
  });

  const activeGoals = allGoals.filter((g) => g.status === "active");
  const completedGoals = allGoals.filter((g) => g.status === "completed");
  const expiredGoals = allGoals.filter((g) => g.status === "expired");

  const completionRate =
    allGoals.length > 0 ? Math.round((completedGoals.length / allGoals.length) * 100) : 0;

  const avgDaysToComplete = (() => {
    const times = completedGoals
      .filter((g) => g.completedAt)
      .map((g) => (new Date(g.completedAt!).getTime() - new Date(g.createdAt).getTime()) / 86_400_000);
    if (times.length === 0) return null;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  })();

  const displayedGoals =
    statusFilter === "all" ? allGoals : allGoals.filter((g) => g.status === statusFilter);

  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-white">Personal Goals</h2>
          <p className="text-sm text-gray-400">
            {activeGoals.length} active &middot; {completedGoals.length} completed &middot;{" "}
            {expiredGoals.length} expired
          </p>
        </div>
        <Button variant="blue" onClick={() => setIsCreateOpen(true)}>
          + New goal
        </Button>
      </div>

      {/* Stats summary */}
      {allGoals.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: allGoals.length },
            { label: "Active", value: activeGoals.length },
            { label: "Completion rate", value: `${completionRate}%` },
            { label: "Avg time", value: avgDaysToComplete !== null ? `${avgDaysToComplete}d` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-0.5 text-lg font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress chart */}
      {activeGoals.length > 0 && (
        <div className="mt-4">
          <GoalProgressChart goals={activeGoals} />
        </div>
      )}

      {/* Status filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", "active", "completed", "expired"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-sm capitalize transition-colors ${
              statusFilter === s
                ? "bg-gray-200 text-gray-900 font-medium"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-12 gap-6">
        {/* Goals list */}
        <div className="col-span-12 xl:col-span-8">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-lg border border-gray-600 bg-gray-800 px-4 py-10">
              <span className="text-sm text-gray-400">Loading goals...</span>
            </div>
          ) : (
            <GoalList
              goals={displayedGoals}
              username={username}
              emptyMessage={
                statusFilter === "all"
                  ? "No goals yet. Create your first goal!"
                  : `No ${statusFilter} goals.`
              }
            />
          )}
        </div>

        {/* Recent milestones */}
        <div className="col-span-12 xl:col-span-4">
          <Label className="text-xs text-gray-200">Recent milestones</Label>
          {milestones.length === 0 ? (
            <div className="mt-2 flex items-center justify-center rounded-lg border border-gray-600 bg-gray-800 px-4 py-6">
              <span className="text-sm text-gray-400">No milestones yet.</span>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-y-2">
              {milestones.slice(0, 10).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-gray-600 bg-gray-800 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-white capitalize">{m.metric.replace(/_/g, " ")}</span>
                    <span className="text-xs text-gray-400">
                      {m.milestoneValue.toLocaleString()} {m.measure}
                    </span>
                  </div>
                  <span className="text-xs text-green-400">✓</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateGoalForm
        username={username}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
