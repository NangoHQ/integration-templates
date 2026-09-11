import { createSync } from "nango";
import * as z from "zod";
import { connectionKpiQuery, getJson, savePayload } from "../shared.js";

const record = z.object({
  id: z.string(),
  endpoint: z.string(),
  fetched_at: z.string(),
  data: z.unknown(),
});
const sync = createSync({
  description:
    "Keeps the last seven days of Tracify new-versus-returning KPI data fresh.",
  version: "1.0.0",
  endpoints: [
    { method: "GET", path: "/tracify/sync/kpis-nvr", group: "Analytics KPIs" },
  ],
  frequency: "every hour",
  autoStart: false,
  syncType: "full",
  metadata: z.void(),
  models: { TracifyKpiNvr: record },
  exec: async (nango) => {
    const input = await connectionKpiQuery(nango, 7);
    const payload = await getJson(nango, "/analytics/api/v1/kpis/nvr_daily_breakdown", input, 10);
    await savePayload(nango, "TracifyKpiNvr", "kpis-nvr", payload);
    await nango.deleteRecordsFromPreviousExecutions("TracifyKpiNvr");
  },
});

export type NangoSyncLocal = Parameters<(typeof sync)["exec"]>[0];
export default sync;
