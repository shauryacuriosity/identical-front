import { createFileRoute } from "@tanstack/react-router";
import { Shapes } from "lucide-react";

export const Route = createFileRoute("/visualisation")({
  component: () => (
    <div className="mx-auto max-w-[1280px] px-6 pt-24 flex flex-col items-center text-center">
      <div className="h-14 w-14 rounded-2xl bg-coral-tint flex items-center justify-center text-coral mb-4">
        <Shapes className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h1 className="text-[32px] text-ink">Visualisation</h1>
      <p className="text-[14px] text-ink-2 mt-1 max-w-md">Chart distributions, correlations, and group comparisons across your dataset.</p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full">
        {[
          "Distribution of sugar intake by age group",
          "Correlation: blood pressure × sodium",
          "Heart rate by dietary cohort",
        ].map((p) => (
          <button key={p} className="text-left p-4 rounded-xl border border-hairline bg-surface hover:border-coral/30 hover:shadow-[var(--shadow-md)] transition text-[13px] text-ink-2">
            {p}
          </button>
        ))}
      </div>
    </div>
  ),
});
