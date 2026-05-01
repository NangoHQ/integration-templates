import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    forwardingEmail: z.string().describe('The forwarding email address to retrieve. Example: "user@example.com"')
});

const ProviderForwardingAddressSchema = z.object({
    forwardingEmail: z.string(),
    verificationStatus: z.enum(['accepted', 'pending', 'confirmationCodeSent']),
    verificationTime: z.string().optional()
});

const OutputSchema = z.object({
    forwardingEmail: z.string(),
    verificationStatus: z.enum(['accepted', 'pending', 'confirmationCodeSent']),
    verificationTime: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a forwarding address configured for the mailbox.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-forwarding-address',
        group: 'Forwarding Addresses'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.forwardingAddresses/get
        // @allowTryCatch - Handle 404 errors with a proper ActionError instead of generic script error
        try {
            const response = await nango.get({
                endpoint: `/gmail/v1/users/me/settings/forwardingAddresses/${encodeURIComponent(input.forwardingEmail)}`,
                retries: 3
            });

            const providerAddress = ProviderForwardingAddressSchema.parse(response.data);

            return {
                forwardingEmail: providerAddress.forwardingEmail,
                verificationStatus: providerAddress.verificationStatus,
                ...(providerAddress.verificationTime !== undefined && { verificationTime: providerAddress.verificationTime })
            };
        } catch (error) {
            if (error instanceof Error && 'status' in error && error.status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Forwarding address not found',
                    forwardingEmail: input.forwardingEmail
                });
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
