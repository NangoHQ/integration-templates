import { createAction } from 'nango';
import * as z from 'zod';
import { getJson, nvrQuery, nvrResponse } from '../shared.js';

const input = nvrQuery.extend({ channel: z.string().min(1).max(100) });
const action = createAction({
    description: 'Fetches new-versus-returning customer KPI data for one channel.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/tracify/kpis/nvr-channel',
        group: 'Analytics KPIs'
    },
    input,
    output: nvrResponse,
    exec: async (nango, values) =>
        nvrResponse.parse(await getJson(nango, `/analytics/api/v1/kpis/nvr_daily_breakdown/${encodeURIComponent(values.channel)}`, values))
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
