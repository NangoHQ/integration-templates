import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sendAsEmail: z.string().describe('The send-as alias email address to verify. Example: "api+test@nango.dev"'),
    userId: z.string().optional().describe('The user ID. Defaults to "me" for the authenticated user.')
});

const action = createAction({
    description: 'Trigger verification for a custom send-as alias',
    version: '1.0.1',
    input: InputSchema,
    output: z.void(),
    scopes: ['https://www.googleapis.com/auth/gmail.settings.sharing'],

    exec: async (nango, input): Promise<void> => {
        const userId = input.userId ?? 'me';

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/verify
        await nango.post({
            endpoint: `/gmail/v1/users/${encodeURIComponent(userId)}/settings/sendAs/${encodeURIComponent(input.sendAsEmail)}/verify`,
            retries: 3
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
