import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Campaign name. Example: "Summer Sale 2024"'),
    type: z.string().describe('Campaign type. Example: "single"'),
    canSplitContent: z.boolean().optional().describe('Whether the campaign can contain split content. Defaults to false.')
});

const ProviderCampaignSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    type: z.string(),
    canSplitContent: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('Campaign ID.'),
    name: z.string().describe('Campaign name.'),
    type: z.string().describe('Campaign type.'),
    canSplitContent: z.boolean().optional().describe('Whether the campaign can contain split content.')
});

const action = createAction({
    description: 'Create a campaign in ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.activecampaign.com/reference/create-campaign
            endpoint: '/3/campaign',
            data: {
                name: input.name,
                type: input.type,
                ...(input.canSplitContent !== undefined && { canSplitContent: input.canSplitContent })
            },
            retries: 3
        });

        const providerCampaign = ProviderCampaignSchema.parse(response.data);

        return {
            id: String(providerCampaign.id),
            name: providerCampaign.name,
            type: providerCampaign.type,
            ...(providerCampaign.canSplitContent !== undefined && { canSplitContent: providerCampaign.canSplitContent })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
