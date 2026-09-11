import { createAction } from "nango";
import * as z from "zod";
import {
  getJson,
  kpiChannelResponseWithName,
  kpiQuery,
} from "../shared.js";

const input = kpiQuery.extend({ channel: z.string().min(1).max(100) });
const action = createAction({
  description: "Fetches KPI data for one Tracify channel.",
  version: "1.0.0",
  endpoint: {
    method: "GET",
    path: "/tracify/kpis/channel",
    group: "Analytics KPIs",
  },
  input,
  output: kpiChannelResponseWithName,
  exec: async (nango, values) =>
    kpiChannelResponseWithName.parse(
      await getJson(
        nango,
        `/analytics/api/v1/kpis/channels/${encodeURIComponent(values.channel)}/`,
        values,
        3,
      ),
    ),
});

export type NangoActionLocal = Parameters<(typeof action)["exec"]>[0];
export default action;
