import { createFileRoute } from "@tanstack/react-router";
import { BoardPending, RacingDesk } from "@/components/racing-desk";
import { loadBoard } from "@/lib/racing.functions";
import type { Board } from "@/lib/racing-types";

export const Route = createFileRoute("/")({
  loader: async (): Promise<Board> => {
    try {
      return await loadBoard({ data: { limit: 18 } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The live card couldn't be loaded.";
      return { races: [], fetchedAt: new Date().toISOString(), error: message };
    }
  },
  pendingComponent: BoardPending,
  pendingMs: 200,
  component: Home,
});

function Home() {
  const initial = Route.useLoaderData();
  return <RacingDesk initial={initial} />;
}
