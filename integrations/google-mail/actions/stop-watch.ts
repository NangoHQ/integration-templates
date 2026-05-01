import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().optional().describe('The user\'s email address. Use "me" to indicate the authenticated user. Defaults to "me". Example: "me"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Stop Gmail push notification watch state for the mailbox.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/stop-watch',
        group: 'Watch'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = input.userId ?? 'me';

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/stop
        await nango.post({
            endpoint: `/gmail/v1/users/${encodeURIComponent(userId)}/stop`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
