import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    forwardingEmail: z.string().describe('The forwarding email address to delete. Example: "forward@example.com"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the forwarding address was successfully deleted')
});

const action = createAction({
    description: 'Delete a forwarding address from Gmail settings.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.forwardingAddresses/delete
        await nango.delete({
            endpoint: `gmail/v1/users/me/settings/forwardingAddresses/${encodeURIComponent(input.forwardingEmail)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
