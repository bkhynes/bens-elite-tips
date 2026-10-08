import { createServerFn } from "@tanstack/react-start";

export const loadRecord = createServerFn({ method: "GET" }).handler(async () => {
  const { syncRecord } = await import("@/lib/settle.server");
  return syncRecord(false);
});
