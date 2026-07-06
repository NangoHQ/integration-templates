import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    campaign_id: z.string().describe('Campaign ID to share. Example: "ec8dae2c-8bd3-461d-90db-a8d262719b5f"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    campaign_id: z.string()
});

const action = createAction({
    description: 'Share a campaign.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/share-campaign',
        method: 'POST'
    },
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.instantly.ai/api-reference/groups/campaign
        await nango.post({
            endpoint: `/v2/campaigns/${encodeURIComponent(input.campaign_id)}/share`,
            retries: 10
        });

        return {
            success: true,
            campaign_id: input.campaign_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
