import { createAction } from "nango";
import * as z from "zod";
import { getJson, pagedKpiQuery } from "../shared.js";

const action = createAction({
  description: "Fetches KPI data grouped by Tracify discount code.",
  version: "1.0.0",
  endpoint: {
    method: "GET",
    path: "/tracify/kpis/discount-codes",
    group: "Analytics KPIs",
  },
  input: pagedKpiQuery,
  output: z.unknown(),
  exec: async (nango, input) =>
    getJson(nango, "/analytics/api/v1/kpis/discount_codes", input),
});

export type NangoActionLocal = Parameters<(typeof action)["exec"]>[0];
export default action;
