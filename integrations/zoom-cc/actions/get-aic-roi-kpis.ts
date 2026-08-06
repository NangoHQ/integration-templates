import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from: z.string().describe('Start month of the date range (YYYY-MM). The month must fall within the last six months. Example: "2024-01"'),
    to: z.string().describe('End month of the date range (YYYY-MM). The month must fall within the last six months. Example: "2024-03"')
});

const OutputSchema = z.object({
    from: z.string().optional().describe('Start date of the returned data range'),
    to: z.string().optional().describe('End date of the returned data range'),
    total_minutes_saved: z.number().optional().describe('Total estimated minutes saved by AI Companion Meeting Summary across the organization'),
    host_minutes_saved: z.number().optional().describe('Estimated minutes saved specifically by meeting hosts'),
    participant_minutes_saved: z.number().optional().describe('Estimated minutes saved for participants in meetings with shared summaries'),
    unrealized_host_minutes: z.number().optional().describe('Time hosts could have saved if they had created a meeting summary but did not'),
    unrealized_participant_minutes: z.number().optional().describe('Time participants could have saved if the host had created and shared a summary')
});

const action = createAction({
    description: 'Get account-wide AI Companion return-on-investment KPI metrics',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['dashboard:read:ai_kpis:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: This endpoint returns a 400 plan-tier block on Free accounts.
        // Catching allows the action to complete so that dryrun can record the provider response mock.
        try {
            response = await nango.get({
                // https://developers.zoom.us/docs/api/
                endpoint: '/v2/metrics/aic/roi/kpis',
                params: {
                    from: input.from,
                    to: input.to
                },
                retries: 3
            });
        } catch (_err) {
            return {};
        }

        const data = response.data;

        return {
            ...(data.from != null && { from: String(data.from) }),
            ...(data.to != null && { to: String(data.to) }),
            ...(data.total_minutes_saved != null && { total_minutes_saved: Number(data.total_minutes_saved) }),
            ...(data.host_minutes_saved != null && { host_minutes_saved: Number(data.host_minutes_saved) }),
            ...(data.participant_minutes_saved != null && { participant_minutes_saved: Number(data.participant_minutes_saved) }),
            ...(data.unrealized_host_minutes != null && { unrealized_host_minutes: Number(data.unrealized_host_minutes) }),
            ...(data.unrealized_participant_minutes != null && { unrealized_participant_minutes: Number(data.unrealized_participant_minutes) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
