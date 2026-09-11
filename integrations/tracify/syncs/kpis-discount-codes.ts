import { createSync } from "nango";
import * as z from "zod";
import {
  connectionKpiQuery,
  getJsonSync,
  kpiDiscountCodesResponse,
  savePayload,
} from "../shared.js";

const record = z.object({
  id: z.string(),
  endpoint: z.string(),
  fetched_at: z.string(),
  data: kpiDiscountCodesResponse,
});
const sync = createSync({
  description:
    "Keeps the last 30 days of Tracify discount-code KPI data fresh.",
  version: "1.0.0",
  endpoints: [
    {
      method: "GET",
      path: "/tracify/sync/discount-codes",
      group: "Analytics KPIs",
    },
  ],
  frequency: "every hour",
  autoStart: false,
  syncType: "full",
  metadata: z.void(),
  models: { TracifyKpiDiscountCodes: record },
  exec: async (nango) => {
    await nango.trackDeletesStart("TracifyKpiDiscountCodes");
    const input = await connectionKpiQuery(nango);
    const payload = kpiDiscountCodesResponse.parse(
      await getJsonSync(nango, "/analytics/api/v1/kpis/discount_codes", input),
    );
    await savePayload(nango, "TracifyKpiDiscountCodes", "kpis-discount-codes", payload);
    await nango.trackDeletesEnd("TracifyKpiDiscountCodes");
  },
});

export type NangoSyncLocal = Parameters<(typeof sync)["exec"]>[0];
export default sync;
