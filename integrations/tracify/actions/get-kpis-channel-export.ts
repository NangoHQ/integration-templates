import { createAction } from "nango";
import * as z from "zod";
import { exportStatusQuery, getJson } from "../shared.js";

const action = createAction({
  description: "Gets the status or result of a Tracify KPI export job.",
  version: "1.0.0",
  endpoint: {
    method: "GET",
    path: "/tracify/kpis/channel-export-status",
    group: "Analytics KPIs",
  },
  input: exportStatusQuery,
  output: z.unknown(),
  exec: async (nango, values) =>
    getJson(
      nango,
      `/analytics/api/v1/kpis/channels/${encodeURIComponent(values.channel)}/exports/${encodeURIComponent(values.taskId)}`,
      values,
    ),
});

export type NangoActionLocal = Parameters<(typeof action)["exec"]>[0];
export default action;
