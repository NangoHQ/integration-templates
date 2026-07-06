import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Campaign ID. Example: "ec8dae2c-8bd3-461d-90db-a8d262719b5f"')
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.number().optional()
});

const action = createAction({
    description: 'Delete a campaign',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:delete', 'campaigns:all', 'all:delete', 'all:all'],
    endpoint: {
        path: '/actions/delete-campaign',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.instantly.ai/api-reference/groups/campaign
        const response = await nango.delete({
            endpoint: `/v2/campaigns/${encodeURIComponent(input.id)}`,
            retries: 10
        });

        const providerResponse = z
            .object({
                id: z.string().optional(),
                status: z.number().optional()
            })
            .passthrough()
            .parse(response.data);

        return {
            id: providerResponse.id ?? input.id,
            ...(providerResponse.status !== undefined && { status: providerResponse.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
