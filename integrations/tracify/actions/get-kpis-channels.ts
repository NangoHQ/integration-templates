import { createAction } from "nango";
import {
  channelQuery,
  getJson,
  kpiChannelsResponse,
} from "../shared.js";

const action = createAction({
  description: "Lists Tracify channel KPI data for a date range.",
  version: "1.0.0",
  endpoint: {
    method: "GET",
    path: "/tracify/kpis/channels",
    group: "Analytics KPIs",
  },
  input: channelQuery,
  output: kpiChannelsResponse,
  exec: async (nango, input) =>
    kpiChannelsResponse.parse(
      await getJson(nango, "/analytics/api/v1/kpis/channels/", input, 3),
    ),
});

export type NangoActionLocal = Parameters<(typeof action)["exec"]>[0];
export default action;
