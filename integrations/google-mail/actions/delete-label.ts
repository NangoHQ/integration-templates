import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the label to delete. Example: "Label_1"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the label was successfully deleted')
});

const action = createAction({
    description: 'Delete a user-created label',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.labels'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/delete
        await nango.delete({
            endpoint: `/gmail/v1/users/me/labels/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
