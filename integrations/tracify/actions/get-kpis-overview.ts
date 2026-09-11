import { createAction } from "nango";
import {
  getJson,
  kpiOverviewResponse,
  kpiQuery,
} from "../shared.js";

const action = createAction({
  description: "Fetches aggregated Tracify KPI overview data for a date range.",
  version: "1.0.0",
  endpoint: {
    method: "GET",
    path: "/tracify/kpis/overview",
    group: "Analytics KPIs",
  },
  input: kpiQuery,
  output: kpiOverviewResponse,
  exec: async (nango, input) =>
    kpiOverviewResponse.parse(
      await getJson(nango, "/analytics/api/v1/kpis/overview/", input, 3),
    ),
});

export type NangoActionLocal = Parameters<(typeof action)["exec"]>[0];
export default action;
