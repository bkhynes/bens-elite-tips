import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-fg">
      <span className="grid size-12 place-items-center rounded-full bg-surface text-gold" aria-hidden="true">
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="mt-4 font-display text-3xl">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm break-words text-pretty text-muted">{errorMessage(error)}</p>
    </main>
  );
}
