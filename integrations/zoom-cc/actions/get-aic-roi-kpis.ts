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

const ProviderResponseSchema = z
    .object({
        from: z.union([z.string(), z.number()]).optional(),
        to: z.union([z.string(), z.number()]).optional(),
        total_minutes_saved: z.coerce.number().optional(),
        host_minutes_saved: z.coerce.number().optional(),
        participant_minutes_saved: z.coerce.number().optional(),
        unrealized_host_minutes: z.coerce.number().optional(),
        unrealized_participant_minutes: z.coerce.number().optional()
    })
    .passthrough();

function matchesPlanTierPayload(payload: unknown): boolean {
    return (
        typeof payload === 'object' &&
        payload !== null &&
        'code' in payload &&
        payload.code === 200 &&
        'message' in payload &&
        typeof payload.message === 'string' &&
        payload.message.includes('only available for')
    );
}

function isPlanTierBlockedError(err: unknown): boolean {
    if (typeof err !== 'object' || err === null) {
        return false;
    }

    if ('response' in err && typeof err.response === 'object' && err.response !== null) {
        const response = err.response;
        if ('status' in response && response.status === 400 && 'data' in response && matchesPlanTierPayload(response.data)) {
            return true;
        }
    }

    if ('status' in err && err.status === 400 && 'payload' in err && matchesPlanTierPayload(err.payload)) {
        return true;
    }

    return false;
}

const action = createAction({
    description: 'Get account-wide AI Companion return-on-investment KPI metrics',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['dashboard:read:aic_roi_kpi:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: This endpoint returns a 400 plan-tier block ("only available for ZMP and
        // Business or higher accounts") on Free accounts. We recover from that documented case only;
        // any other failure (auth, rate limit, transient error) is rethrown so callers/retries see it.
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
        } catch (err) {
            if (isPlanTierBlockedError(err)) {
                return {};
            }
            throw err;
        }

        if (response.status === 400 && matchesPlanTierPayload(response.data)) {
            return {};
        }

        const data = ProviderResponseSchema.parse(response.data);

        return {
            ...(data.from != null && { from: String(data.from) }),
            ...(data.to != null && { to: String(data.to) }),
            ...(data.total_minutes_saved != null && { total_minutes_saved: data.total_minutes_saved }),
            ...(data.host_minutes_saved != null && { host_minutes_saved: data.host_minutes_saved }),
            ...(data.participant_minutes_saved != null && { participant_minutes_saved: data.participant_minutes_saved }),
            ...(data.unrealized_host_minutes != null && { unrealized_host_minutes: data.unrealized_host_minutes }),
            ...(data.unrealized_participant_minutes != null && { unrealized_participant_minutes: data.unrealized_participant_minutes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
