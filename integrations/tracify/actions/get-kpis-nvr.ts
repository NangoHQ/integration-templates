import { createAction } from "nango";
import { getJson, nvrQuery, nvrResponse } from "../shared.js";

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
  output: nvrResponse,
  exec: async (nango, input) =>
    nvrResponse.parse(
      await getJson(nango, "/analytics/api/v1/kpis/nvr_daily_breakdown", input, 3),
    ),
});

export type NangoActionLocal = Parameters<(typeof action)["exec"]>[0];
export default action;
