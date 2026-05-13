import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/ai-analysis")({
  component: () => (
    <div className="flex items-center justify-center min-h-[60vh] flex-col gap-2">
      <h1 className="text-5xl font-bold">AI Analysis</h1>
      <p className="text-foreground/60">Welcome</p>
    </div>
  ),
});
