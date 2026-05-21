import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy URL — results live on `/runs/:runId` after a run is submitted. */
export const Route = createFileRoute("/ai-analysis/results")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-analysis", search: { projectId: undefined } });
  },
});
