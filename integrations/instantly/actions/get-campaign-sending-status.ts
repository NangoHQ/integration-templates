import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    campaign_id: z.string().describe('Campaign ID. Example: "9b6f458e-6dc5-4762-83d5-a528aedd2235"')
});

const ProviderSummarySchema = z.object({
    status: z.string(),
    status_message: z.string(),
    ai_summary: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    summary: ProviderSummarySchema
});

const OutputSchema = z.object({
    status: z.string(),
    status_message: z.string(),
    ai_summary: z.string().optional()
});

const action = createAction({
    description: 'Get campaign sending status.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'GET',
        path: '/actions/get-campaign-sending-status'
    },
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/groups/campaign
            endpoint: `/v2/campaigns/${encodeURIComponent(input.campaign_id)}/sending-status`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            status: providerResponse.summary.status,
            status_message: providerResponse.summary.status_message,
            ...(providerResponse.summary.ai_summary != null && {
                ai_summary: providerResponse.summary.ai_summary
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
