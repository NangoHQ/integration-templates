import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('The deal ID to delete. Example: 11')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.number().int()
});

const action = createAction({
    description: 'Delete or archive a deal in ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-deal',
        group: 'Deals'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.activecampaign.com/reference/delete-a-deal
            endpoint: `/3/deals/${encodeURIComponent(String(input.id))}`,
            retries: 1
        });

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete deal ${input.id}. Status: ${response.status}`,
                id: input.id
            });
        }

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
