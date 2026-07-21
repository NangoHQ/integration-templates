import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('A domain name at which you can receive email. Example: "example.com"'),
    mailbox: z.string().describe('A mailbox at the domain where the verification email should be sent. Example: "postmaster"')
});

const ProviderResponseSchema = z.object({
    status: z.enum(['sent', 'already_verified']),
    domain: z.string(),
    email: z.string()
});

const OutputSchema = z.object({
    status: z.enum(['sent', 'already_verified']),
    domain: z.string(),
    email: z.string()
});

const action = createAction({
    description: 'Send a verification email to confirm ownership of a sender domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/senders/verify-domain
            endpoint: '/1.4/senders/verify-domain',
            data: {
                domain: input.domain,
                mailbox: input.mailbox
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            status: providerResponse.status,
            domain: providerResponse.domain,
            email: providerResponse.email
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
