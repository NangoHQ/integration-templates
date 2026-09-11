import { createSync } from "nango";
import * as z from "zod";
import {
  connectionKpiQuery,
  getJsonSync,
  kpiOverviewResponse,
  savePayload,
} from "../shared.js";

const record = z.object({
  id: z.string(),
  endpoint: z.string(),
  fetched_at: z.string(),
  data: kpiOverviewResponse,
});
const sync = createSync({
  description:
    "Keeps the last 30 days of aggregated Tracify KPI overview data fresh.",
  version: "1.0.0",
  endpoints: [
    {
      method: "GET",
      path: "/tracify/sync/kpis-overview",
      group: "Analytics KPIs",
    },
  ],
  frequency: "every hour",
  autoStart: false,
  syncType: "full",
  metadata: z.void(),
  models: { TracifyKpiOverview: record },
  exec: async (nango) => {
    await nango.trackDeletesStart("TracifyKpiOverview");
    const input = await connectionKpiQuery(nango);
    const payload = kpiOverviewResponse.parse(
      await getJsonSync(nango, "/analytics/api/v1/kpis/overview/", input),
    );
    await savePayload(nango, "TracifyKpiOverview", "kpis-overview", payload);
    await nango.trackDeletesEnd("TracifyKpiOverview");
  },
});

export type NangoSyncLocal = Parameters<(typeof sync)["exec"]>[0];
export default sync;
