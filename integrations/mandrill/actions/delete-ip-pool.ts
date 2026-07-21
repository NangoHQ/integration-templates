import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    pool: z.string().describe('The name of the dedicated IP pool to delete. Example: "my-pool"')
});

const ProviderResponseSchema = z.object({
    deleted: z.boolean(),
    pool: z.string()
});

const OutputSchema = z.object({
    deleted: z.boolean(),
    pool: z.string()
});

const action = createAction({
    description: 'Delete a dedicated IP pool.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ips'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://mailchimp.com/developer/transactional/api/ips/delete-pool/
            endpoint: '/1.0/ips/delete-pool.json',
            data: {
                pool: input.pool
            },
            retries: 1
        };

        const response = await nango.post(config);

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Mandrill when deleting IP pool.',
                response: response.data
            });
        }

        return {
            deleted: parsed.data.deleted,
            pool: parsed.data.pool
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
