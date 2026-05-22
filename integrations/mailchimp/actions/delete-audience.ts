import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The unique ID for the audience/list to delete. Example: "a1b2c3d4e5"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    list_id: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a audience in Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-audience',
        group: 'Audiences'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://mailchimp.com/developer/marketing/api/lists/delete-list/
        const response = await nango.delete({
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}`,
            retries: 3
        });

        if (response.status !== 204 && response.status !== 200) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete audience. Received status ${response.status}.`,
                list_id: input.list_id
            });
        }

        return {
            success: true,
            list_id: input.list_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
