import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Campaign ID. Example: 1')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const ProviderDeleteResponseSchema = z.object({
    succeeded: z.number(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a campaign in ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.activecampaign.com/reference/campaigns
        const response = await nango.delete({
            endpoint: `/3/campaigns/${encodeURIComponent(String(input.id))}/delete`,
            retries: 3
        });

        const providerResponse = ProviderDeleteResponseSchema.parse(response.data);

        if (providerResponse.succeeded !== 1) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: providerResponse.message || 'Failed to delete campaign',
                campaign_id: input.id
            });
        }

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
