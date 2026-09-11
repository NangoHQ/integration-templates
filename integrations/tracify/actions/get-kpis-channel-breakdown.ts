import { createAction } from 'nango';
import * as z from 'zod';
import { breakdownDimension, channelBreakdownQuery, getJson, kpiChannelBreakdownResponse } from '../shared.js';

const input = channelBreakdownQuery.extend({
    channel: z.string().min(1).max(100),
    breakdownDimension
});
const action = createAction({
    description: 'Fetches a paginated KPI breakdown for one Tracify channel.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/tracify/kpis/channel-breakdown',
        group: 'Analytics KPIs'
    },
    input,
    output: kpiChannelBreakdownResponse,
    exec: async (nango, values) =>
        kpiChannelBreakdownResponse.parse(
            await getJson(
                nango,
                `/analytics/api/v1/kpis/channels/${encodeURIComponent(values.channel)}/${encodeURIComponent(values.breakdownDimension)}`,
                values
            )
        )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
