import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the label to delete. Example: "6a26f31a38499a69b58916df"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Permanently delete a Trello label.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.atlassian.com/cloud/trello/rest/api-group-labels/
        const response = await nango.delete({
            endpoint: `/1/labels/${encodeURIComponent(input.id)}`,
            retries: 1
        });

        z.unknown().parse(response.data);

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
