import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('The ID of the list to delete. Example: 13')
});

const OutputSchema = z.object({
    id: z.number().int(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a list in ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-list',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['lists'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.activecampaign.com/reference/delete-a-list
            endpoint: `/3/lists/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        const data = z.object({}).parse(response.data);

        if (Object.keys(data).length === 0) {
            return {
                id: input.id,
                success: true
            };
        }

        return {
            id: input.id,
            success: false
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
