import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the draft to delete. Example: "r-1234567890abcdef"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the draft was successfully deleted')
});

const action = createAction({
    description: 'Delete an existing draft by draft ID',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-draft',
        group: 'Drafts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/delete
        await nango.delete({
            endpoint: `/gmail/v1/users/me/drafts/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
