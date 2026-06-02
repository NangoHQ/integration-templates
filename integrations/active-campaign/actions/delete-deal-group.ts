import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Deal group (pipeline) ID. Example: 1')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.number()
});

const action = createAction({
    description: 'Delete a deal group (pipeline) in ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-deal-group',
        group: 'Deals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deal'], // ActiveCampaign API requires deal permissions to manage pipelines.

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.activecampaign.com/reference/delete-a-pipeline
        await nango.delete({
            endpoint: `/3/dealGroups/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
