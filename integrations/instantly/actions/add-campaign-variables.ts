import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    campaign_id: z.string().describe('Campaign ID. Example: "9b6f458e-6dc5-4762-83d5-a528aedd2235"'),
    variables: z.array(z.string()).describe('Array of custom variable name strings to register on the campaign. Example: ["first_name", "company_name"]')
});

const CampaignSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        status: z.number().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Add custom variable names to a campaign',
    version: '1.0.0',
    input: InputSchema,
    output: CampaignSchema,
    scopes: [],
    endpoint: {
        path: '/actions/add-campaign-variables',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof CampaignSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/groups/campaign
            endpoint: `/v2/campaigns/${encodeURIComponent(input.campaign_id)}/variables`,
            data: {
                variables: input.variables
            },
            retries: 3
        });

        const campaign = CampaignSchema.parse(response.data);

        return campaign;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
