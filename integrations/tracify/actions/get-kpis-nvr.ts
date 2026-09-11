import { createAction } from "nango";
import * as z from "zod";
import { getJson, nvrQuery } from "../shared.js";

const action = createAction({
  description:
    "Fetches new-versus-returning customer KPI data across channels.",
  version: "1.0.0",
  endpoint: {
    method: "GET",
    path: "/tracify/kpis/nvr",
    group: "Analytics KPIs",
  },
  input: nvrQuery,
  output: z.unknown(),
  exec: async (nango, input) =>
    getJson(nango, "/analytics/api/v1/kpis/nvr_daily_breakdown", input),
});

export type NangoActionLocal = Parameters<(typeof action)["exec"]>[0];
export default action;
