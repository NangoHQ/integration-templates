import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    host: z.string().describe('Custom tracking domain host. Example: "mail.yourdomain.com"')
});

const ProviderOutputSchema = z.object({
    success: z.boolean().optional(),
    ssl: z.boolean(),
    cname: z.boolean(),
    host: z.string()
});

const OutputSchema = z.object({
    success: z.boolean().optional(),
    ssl: z.boolean(),
    cname: z.boolean(),
    host: z.string()
});

const action = createAction({
    description: 'Get custom tracking domain status.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounts:read'],
    endpoint: {
        method: 'POST',
        path: '/actions/get-custom-tracking-domain-status'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/account/get-custom-tracking-domain-status.md
            endpoint: '/v2/accounts/ctd/status',
            params: {
                host: input.host
            },
            retries: 3
        });

        const providerOutput = ProviderOutputSchema.parse(response.data);

        return {
            success: providerOutput.success,
            ssl: providerOutput.ssl,
            cname: providerOutput.cname,
            host: providerOutput.host
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
