import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pool: z.string().describe('The name of the IP pool to create. Example: "my-pool"')
});

const CustomDnsSchema = z.object({
    enabled: z.boolean(),
    valid: z.boolean(),
    error: z.string().nullable()
});

const WarmupStatusSchema = z.object({
    warming_up: z.boolean(),
    start_at: z.string().nullable(),
    end_at: z.string().nullable()
});

const IpSchema = z.object({
    ip: z.string(),
    created_at: z.string(),
    pool: z.string(),
    domain: z.string(),
    custom_dns: CustomDnsSchema,
    warmup: WarmupStatusSchema
});

const ProviderPoolSchema = z.object({
    name: z.string(),
    created_at: z.string(),
    ips: z.array(IpSchema)
});

const OutputSchema = z.object({
    name: z.string(),
    created_at: z.string(),
    ips: z.array(IpSchema)
});

const action = createAction({
    description: 'Create a new dedicated IP pool.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ips'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/ips/create-pool/
            endpoint: '/1.0/ips/create-pool',
            data: {
                pool: input.pool
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Failed to create IP pool: no response from provider.'
            });
        }

        const providerPool = ProviderPoolSchema.parse(response.data);

        return {
            name: providerPool.name,
            created_at: providerPool.created_at,
            ips: providerPool.ips
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
