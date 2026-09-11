import { createSync } from "nango";
import * as z from "zod";
import {
  connectionKpiQuery,
  getJson,
  kpiChannelsResponse,
  savePayload,
} from "../shared.js";

const record = z.object({
  id: z.string(),
  endpoint: z.string(),
  fetched_at: z.string(),
  data: kpiChannelsResponse,
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
    await nango.trackDeletesStart("TracifyKpiChannels");
    const input = await connectionKpiQuery(nango);
    const payload = kpiChannelsResponse.parse(
      await getJson(nango, "/analytics/api/v1/kpis/channels/", input, 3),
    );
    await savePayload(nango, "TracifyKpiChannels", "kpis-channels", payload);
    await nango.trackDeletesEnd("TracifyKpiChannels");
  },
});

export type NangoSyncLocal = Parameters<(typeof sync)["exec"]>[0];
export default sync;
