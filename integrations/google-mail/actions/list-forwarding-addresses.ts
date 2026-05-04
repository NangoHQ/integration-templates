import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().optional().describe('The users email address. The special value me can be used to indicate the authenticated user. Defaults to "me".')
});

const ProviderForwardingAddressSchema = z.object({
    forwardingEmail: z.string(),
    verificationStatus: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    forwardingAddresses: z.array(ProviderForwardingAddressSchema).optional()
});

const ForwardingAddressSchema = z.object({
    forwardingEmail: z.string(),
    verificationStatus: z.string().optional()
});

const OutputSchema = z.object({
    forwardingAddresses: z.array(ForwardingAddressSchema)
});

const action = createAction({
    description: 'List forwarding addresses configured for the mailbox.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-forwarding-addresses',
        group: 'Settings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = input.userId ?? 'me';

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.forwardingAddresses/list
        const response = await nango.get({
            endpoint: `/gmail/v1/users/${encodeURIComponent(userId)}/settings/forwardingAddresses`,
            retries: 3
        });

        if (!response.data || Object.keys(response.data).length === 0) {
            return {
                forwardingAddresses: []
            };
        }

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            forwardingAddresses: parsed.forwardingAddresses ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
