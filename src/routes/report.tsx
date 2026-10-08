import { createFileRoute, Link } from "@tanstack/react-router";
import { loadMorningReport } from "@/lib/morning.functions";

export const Route = createFileRoute("/report")({
  loader: () => loadMorningReport(),
  component: ReportRoute,
});

function ReportRoute() {
  const report = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="press font-display text-lg leading-none">
            Elite <span className="text-gold">Tips</span>
          </Link>
          <Link to="/record" className="press text-sm text-gold">
            All suggestions
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-6 pb-24">
        <p className="text-sm tracking-wide text-gold uppercase">Yesterday</p>
        <h1 className="mt-1 font-display text-4xl leading-tight">{report.label}</h1>
        <p className="mt-2 text-sm text-muted">Emailed at 7:00am Perth.</p>
        <pre id="morning-report" className="mt-6 font-sans text-sm leading-relaxed whitespace-pre-wrap">
          {report.body}
        </pre>
      </main>
    </div>
  );
}
