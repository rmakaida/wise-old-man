"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { METRICS, Metric, MetricProps } from "@wise-old-man/utils";
import { useToast } from "~/hooks/useToast";
import { useWOMClient } from "~/hooks/useWOMClient";
import { Button } from "~/components/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/Dialog";
import { Label } from "~/components/Label";
import { Input } from "~/components/Input";

import LoadingIcon from "~/assets/loading.svg";

interface CreateGoalFormProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGoalForm({ username, isOpen, onClose }: CreateGoalFormProps) {
  const toast = useToast();
  const client = useWOMClient();
  const router = useRouter();
  const [isTransitioning, startTransition] = useTransition();

  const [metric, setMetric] = useState<Metric>(Metric.ATTACK);
  const [targetValue, setTargetValue] = useState("");
  const [deadline, setDeadline] = useState("");
  const [title, setTitle] = useState("");

  const createMutation = useMutation({
    mutationFn: () => {
      return client.goals.createGoal(username, {
        metric,
        targetValue: Number(targetValue),
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        title: title || undefined,
      });
    },
    onSuccess: () => {
      toast.toast({ variant: "success", title: "Goal created successfully!" });
      startTransition(() => {
        router.refresh();
      });
      onClose();
      setMetric(Metric.ATTACK);
      setTargetValue("");
      setDeadline("");
      setTitle("");
    },
    onError: (e) => {
      toast.toast({ variant: "error", title: "Failed to create goal.", description: e.message });
    },
  });

  const skillMetrics = METRICS.filter((m) => m in MetricProps && (MetricProps[m as keyof typeof MetricProps] as { type?: string }).type === "skill");
  const bossMetrics = METRICS.filter((m) => m in MetricProps && (MetricProps[m as keyof typeof MetricProps] as { type?: string }).type === "boss");
  const activityMetrics = METRICS.filter((m) => m in MetricProps && (MetricProps[m as keyof typeof MetricProps] as { type?: string }).type === "activity");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new goal</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <div className="flex flex-col gap-y-1">
            <Label htmlFor="metric">Metric</Label>
            <select
              id="metric"
              className="rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={metric}
              onChange={(e) => setMetric(e.target.value as Metric)}
            >
              <optgroup label="Skills">
                {skillMetrics.map((m) => (
                  <option key={m} value={m}>
                    {MetricProps[m as keyof typeof MetricProps].name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Bosses">
                {bossMetrics.map((m) => (
                  <option key={m} value={m}>
                    {MetricProps[m as keyof typeof MetricProps].name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Activities">
                {activityMetrics.map((m) => (
                  <option key={m} value={m}>
                    {MetricProps[m as keyof typeof MetricProps].name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="flex flex-col gap-y-1">
            <Label htmlFor="targetValue">Target value</Label>
            <Input
              id="targetValue"
              type="number"
              min={1}
              placeholder="e.g. 13034431"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-y-1">
            <Label htmlFor="title">
              Title <span className="text-gray-400">(optional)</span>
            </Label>
            <Input
              id="title"
              type="text"
              maxLength={100}
              placeholder="e.g. Reach 99 Attack"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-y-1">
            <Label htmlFor="deadline">
              Deadline <span className="text-gray-400">(optional)</span>
            </Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            variant="blue"
            disabled={createMutation.isPending || isTransitioning || !targetValue}
          >
            {createMutation.isPending || isTransitioning ? (
              <>
                Creating...
                <LoadingIcon className="-mr-1 ml-1 h-4 w-4 animate-spin text-white" />
              </>
            ) : (
              "Create goal"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
