import { createFileRoute } from "@tanstack/react-router";
import { Box } from "lucide-react";

export const Route = createFileRoute("/ai-analysis")({
  component: () => (
    <div className="mx-auto max-w-[1280px] px-6 pt-24 flex flex-col items-center text-center">
      <div className="h-14 w-14 rounded-2xl bg-coral-tint flex items-center justify-center text-coral mb-4">
        <Box className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h1 className="text-[32px] text-ink">AI Analysis</h1>
      <p className="text-[14px] text-ink-2 mt-1 max-w-md">Ask questions of your dataset in plain English — summaries, hypotheses, and follow-ups.</p>
      <div className="mt-8 max-w-2xl w-full">
        <div className="rounded-xl border border-hairline bg-surface shadow-[var(--shadow-sm)] p-1.5 flex items-center gap-2">
          <input
            placeholder="Which dietary factors most correlate with high blood pressure?"
            className="flex-1 h-10 px-3 bg-transparent text-[13.5px] placeholder:text-ink-3 focus:outline-none"
          />
          <button className="h-10 px-4 rounded-lg bg-coral text-white text-[13px] font-medium">Ask</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {["Summarise the dataset", "Find outliers in heart rate", "Cluster cohorts by diet"].map((s) => (
            <button key={s} className="text-[12px] text-ink-2 px-2.5 py-1 rounded-full border border-hairline hover:border-coral/40 hover:text-ink transition">{s}</button>
          ))}
        </div>
      </div>
    </div>
  ),
});
