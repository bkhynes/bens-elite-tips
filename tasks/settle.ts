import { defineTask } from "nitro/task";

export default defineTask({
  meta: { name: "settle", description: "Record whether stored suggestions won after the jump." },
  async run() {
    const { settlePending } = await import("../src/lib/settle.server");
    const result = await settlePending(true);
    return { result };
  },
});
