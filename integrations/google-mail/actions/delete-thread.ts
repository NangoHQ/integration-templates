import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the thread to delete. Example: "123abc456def789"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string()
});

const action = createAction({
    description: 'Permanently delete a Gmail thread and its messages.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-thread'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://mail.google.com/'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/delete
        await nango.delete({
            endpoint: `/gmail/v1/users/me/threads/${encodeURIComponent(input.id)}`,
            retries: 10
        });

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
