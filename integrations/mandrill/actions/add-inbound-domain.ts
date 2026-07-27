import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('A domain name for inbound email delivery. Example: "inbound.example.com"')
});

const ProviderResponseSchema = z.object({
    domain: z.string(),
    created_at: z.string(),
    valid_mx: z.boolean()
});

const OutputSchema = z.object({
    domain: z.string(),
    created_at: z.string(),
    valid_mx: z.boolean()
});

const action = createAction({
    description: 'Add an inbound-routing domain to the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://mailchimp.com/developer/transactional/api/inbound/add-inbound-domain/
            endpoint: '1.0/inbound/add-domain.json',
            data: {
                domain: input.domain
            },
            retries: 1
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            domain: providerResponse.domain,
            created_at: providerResponse.created_at,
            valid_mx: providerResponse.valid_mx
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
