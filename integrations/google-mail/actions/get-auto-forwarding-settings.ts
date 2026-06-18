import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().optional().describe('User ID. Use "me" for the currently authenticated user. Example: "me"')
});

const ProviderAutoForwardingSchema = z.object({
    enabled: z.boolean().optional(),
    emailAddress: z.string().optional(),
    disposition: z.string().optional()
});

const OutputSchema = z.object({
    enabled: z.boolean().optional(),
    emailAddress: z.string().optional(),
    disposition: z.string().optional()
});

const action = createAction({
    description: 'Retrieve the mailbox auto-forwarding configuration.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = input.userId || 'me';

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/getAutoForwarding
        const response = await nango.get({
            endpoint: `/gmail/v1/users/${encodeURIComponent(userId)}/settings/autoForwarding`,
            retries: 3
        });

        const providerData = ProviderAutoForwardingSchema.parse(response.data);

        return {
            ...(providerData.enabled !== undefined && { enabled: providerData.enabled }),
            ...(providerData.emailAddress !== undefined && { emailAddress: providerData.emailAddress }),
            ...(providerData.disposition !== undefined && { disposition: providerData.disposition })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
