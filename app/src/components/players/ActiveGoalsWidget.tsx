import Link from "next/link";
import { GoalResponse, MetricProps } from "@wise-old-man/utils";
import { Label } from "~/components/Label";
import { MetricIconSmall } from "~/components/Icon";
import { getPlayerGoals } from "~/services/wiseoldman";

interface ActiveGoalsWidgetProps {
  username: string;
}

export async function ActiveGoalsWidget({ username }: ActiveGoalsWidgetProps) {
  let goals: GoalResponse[] = [];

  try {
    goals = await getPlayerGoals(username, "active");
  } catch {
    return null;
  }

  if (goals.length === 0) return null;

  const topGoals = goals.slice(0, 3);

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-200">Active Goals</Label>
        <Link
          href={`/players/${username}/goals`}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          View all ({goals.length})
        </Link>
      </div>

      <div className="flex flex-col gap-y-2">
        {topGoals.map((goal) => (
          <ActiveGoalItem key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}

function ActiveGoalItem({ goal }: { goal: GoalResponse }) {
  const metricName =
    goal.metric in MetricProps
      ? MetricProps[goal.metric as keyof typeof MetricProps].name
      : goal.metric;
  const title = goal.title ?? `${metricName} — ${goal.targetValue.toLocaleString()} ${goal.measure}`;
  const pct = Math.floor(goal.progress * 100);

  return (
    <div className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2">
      <div className="flex items-center gap-x-2 mb-1.5">
        <MetricIconSmall metric={goal.metric as never} />
        <span className="text-xs text-white truncate flex-1">{title}</span>
        <span className="text-xs text-gray-400 shrink-0">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-700">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
