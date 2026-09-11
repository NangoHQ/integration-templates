import { createAction } from "nango";
import * as z from "zod";
import { getJson, kpiQuery } from "../shared.js";

const action = createAction({
  description: "Lists Tracify channel KPI data for a date range.",
  version: "1.0.0",
  endpoint: {
    method: "GET",
    path: "/tracify/kpis/channels",
    group: "Analytics KPIs",
  },
  input: kpiQuery,
  output: z.unknown(),
  exec: async (nango, input) =>
    getJson(nango, "/analytics/api/v1/kpis/channels/", input),
});

export type NangoActionLocal = Parameters<(typeof action)["exec"]>[0];
export default action;
