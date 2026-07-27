import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('The inbound domain to check. Example: "example.com"')
});

const ProviderResponseSchema = z.object({
    domain: z.string(),
    created_at: z.string().describe('The date and time that the inbound domain was added as a UTC string in YYYY-MM-DD HH:MM:SS format'),
    valid_mx: z.boolean().describe('Whether this inbound domain has successfully set up an MX record to deliver mail to the Mandrill servers')
});

const OutputSchema = z.object({
    domain: z.string(),
    created_at: z.string().optional(),
    valid_mx: z.boolean().optional()
});

const action = createAction({
    description: 'Check the MX settings for an inbound-routing domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/inbound/check-domain/
            endpoint: '/1.0/inbound/check-domain',
            data: {
                domain: input.domain
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Domain not found or inbound not enabled',
                domain: input.domain
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            domain: providerResponse.domain,
            ...(providerResponse.created_at != null && { created_at: providerResponse.created_at }),
            ...(providerResponse.valid_mx != null && { valid_mx: providerResponse.valid_mx })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
