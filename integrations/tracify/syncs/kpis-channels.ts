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
  description: "Keeps the last 30 days of Tracify channel KPI data fresh.",
  version: "1.0.0",
  endpoints: [
    {
      method: "GET",
      path: "/tracify/sync/kpis-channels",
      group: "Analytics KPIs",
    },
  ],
  frequency: "every hour",
  autoStart: false,
  syncType: "full",
  metadata: z.void(),
  models: { TracifyKpiChannels: record },
  exec: async (nango) => {
    const input = await connectionKpiQuery(nango);
    const payload = await getJson(nango, "/analytics/api/v1/kpis/channels/", input, 10);
    await savePayload(nango, "TracifyKpiChannels", "kpis-channels", payload);
    await nango.deleteRecordsFromPreviousExecutions("TracifyKpiChannels");
  },
});

export type NangoSyncLocal = Parameters<(typeof sync)["exec"]>[0];
export default sync;
