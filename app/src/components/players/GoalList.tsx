"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { GoalResponse, MetricProps } from "@wise-old-man/utils";
import { MetricIcon } from "~/components/Icon";
import { LocalDate } from "~/components/LocalDate";
import { useWOMClient } from "~/hooks/useWOMClient";
import { useToast } from "~/hooks/useToast";
import { Button } from "~/components/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/Dialog";
import { Label } from "~/components/Label";
import { Input } from "~/components/Input";
import LoadingIcon from "~/assets/loading.svg";

interface GoalListProps {
  goals: GoalResponse[];
  username?: string;
  emptyMessage?: string;
}

export function GoalList({ goals, username, emptyMessage = "No goals found." }: GoalListProps) {
  const [editingGoal, setEditingGoal] = useState<GoalResponse | null>(null);

  if (goals.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-600 bg-gray-800 px-4 py-10">
        <span className="text-sm text-gray-400">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-y-2">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            username={username}
            onEdit={username ? () => setEditingGoal(goal) : undefined}
          />
        ))}
      </div>

      {username && editingGoal && (
        <EditGoalDialog
          username={username}
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
        />
      )}
    </>
  );
}

interface GoalCardProps {
  goal: GoalResponse;
  username?: string;
  onEdit?: () => void;
}

function GoalCard({ goal, username, onEdit }: GoalCardProps) {
  const router = useRouter();
  const client = useWOMClient();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const metricName =
    goal.metric in MetricProps
      ? MetricProps[goal.metric as keyof typeof MetricProps].name
      : goal.metric;
  const title =
    goal.title ?? `Reach ${goal.targetValue.toLocaleString()} ${goal.measure} in ${metricName}`;
  const progressPct = Math.floor(goal.progress * 100);
  const isCompleted = goal.status === "completed";
  const isExpired = goal.status === "expired";
  const isActive = goal.status === "active";

  const deleteMutation = useMutation({
    mutationFn: () => client.goals.deleteGoal(username!, goal.id),
    onSuccess: () => {
      toast.toast({ variant: "success", title: "Goal deleted." });
      startTransition(() => router.refresh());
    },
    onError: () => {
      toast.toast({ variant: "error", title: "Failed to delete goal." });
    },
  });

  const remainingLabel = (() => {
    if (!goal.deadline || isCompleted || isExpired) return null;
    const msLeft = new Date(goal.deadline).getTime() - Date.now();
    if (msLeft <= 0) return <span className="font-medium text-red-400">Overdue</span>;
    const daysLeft = Math.ceil(msLeft / 86_400_000);
    if (daysLeft === 1) return <span className="font-medium text-yellow-400">1 day left</span>;
    if (daysLeft <= 7) return <span className="font-medium text-yellow-400">{daysLeft} days left</span>;
    return <span className="text-gray-400">{daysLeft} days left</span>;
  })();

  return (
    <div className="flex flex-col gap-y-3 rounded-lg border border-gray-600 bg-gray-800 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-x-2">
        <div className="flex items-center gap-x-2">
          <MetricIcon metric={goal.metric as never} />
          <div>
            <p className="text-sm font-medium text-white">{title}</p>
            {goal.description && (
              <p className="text-xs text-gray-400">{goal.description}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-x-2">
          <GoalStatusBadge status={goal.status} />
          {username && isActive && (
            <>
              <button
                onClick={onEdit}
                title="Edit goal"
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              >
                ✎
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this goal?")) deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
                title="Delete goal"
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-red-400"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-gray-400">
          <span>{goal.currentValue.toLocaleString()}</span>
          <span>{progressPct}%</span>
          <span>{goal.targetValue.toLocaleString()}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
          <div
            className={`h-full rounded-full transition-all ${
              isCompleted ? "bg-green-500" : isExpired ? "bg-red-500" : "bg-blue-500"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
        {remainingLabel}
        {goal.deadline && !isCompleted && (
          <span>
            Deadline: <LocalDate isoDate={new Date(goal.deadline).toISOString()} />
          </span>
        )}
        {goal.completedAt && (
          <span>
            Completed: <LocalDate isoDate={new Date(goal.completedAt).toISOString()} />
          </span>
        )}
        <span>
          Created: <LocalDate isoDate={new Date(goal.createdAt).toISOString()} />
        </span>
      </div>
    </div>
  );
}

function GoalStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-blue-900 text-blue-300",
    completed: "bg-green-900 text-green-300",
    expired: "bg-red-900 text-red-300",
  };
  return (
    <span
      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? ""}`}
    >
      {status}
    </span>
  );
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

interface EditGoalDialogProps {
  username: string;
  goal: GoalResponse;
  onClose: () => void;
}

function EditGoalDialog({ username, goal, onClose }: EditGoalDialogProps) {
  const router = useRouter();
  const client = useWOMClient();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [title, setTitle] = useState(goal.title ?? "");
  const [description, setDescription] = useState(goal.description ?? "");
  const [deadline, setDeadline] = useState(
    goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 16) : ""
  );

  const updateMutation = useMutation({
    mutationFn: () =>
      client.goals.updateGoal(username, goal.id, {
        title: title || undefined,
        description: description || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      }),
    onSuccess: () => {
      toast.toast({ variant: "success", title: "Goal updated." });
      startTransition(() => router.refresh());
      onClose();
    },
    onError: (e) => {
      toast.toast({ variant: "error", title: "Failed to update goal.", description: e.message });
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit goal</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
        >
          <div className="flex flex-col gap-y-1">
            <Label htmlFor="edit-title">
              Title <span className="text-gray-400">(optional)</span>
            </Label>
            <Input
              id="edit-title"
              type="text"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Reach 99 Attack"
            />
          </div>

          <div className="flex flex-col gap-y-1">
            <Label htmlFor="edit-description">
              Description <span className="text-gray-400">(optional)</span>
            </Label>
            <Input
              id="edit-description"
              type="text"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex flex-col gap-y-1">
            <Label htmlFor="edit-deadline">
              Deadline <span className="text-gray-400">(optional)</span>
            </Label>
            <Input
              id="edit-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="flex gap-x-2">
            <Button type="button" variant="default" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="blue"
              disabled={updateMutation.isPending}
              className="flex-1"
            >
              {updateMutation.isPending ? (
                <>
                  Saving…{" "}
                  <LoadingIcon className="ml-1 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
