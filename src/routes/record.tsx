import { createFileRoute, Link } from "@tanstack/react-router";
import { loadRecord } from "@/lib/record.functions";
import { RecordPage } from "@/components/record-page";

export const Route = createFileRoute("/record")({
  loader: () => loadRecord(),
  component: RecordRoute,
});

function RecordRoute() {
  const record = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="press font-display text-lg leading-none">
            Elite <span className="text-gold">Tips</span>
          </Link>
          <p className="font-display text-2xl leading-none text-gold tabular-nums">{strikeLabel(record.strike)}</p>
        </div>
      </header>
      <RecordPage record={record} />
    </div>
  );
}

function strikeLabel(strike: number | null) {
  if (strike == null) return "—";
  return `${Math.round(strike * 100)}%`;
}
