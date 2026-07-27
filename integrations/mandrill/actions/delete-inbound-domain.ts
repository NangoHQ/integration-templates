import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('The inbound domain to delete. Example: "inbound.example.com"')
});

const ProviderResponseSchema = z.object({
    domain: z.string(),
    created_at: z.string().optional(),
    valid_mx: z.boolean().optional()
});

const OutputSchema = z.object({
    domain: z.string(),
    created_at: z.string().optional(),
    valid_mx: z.boolean().optional()
});

const action = createAction({
    description: 'Delete an inbound-routing domain from the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://mailchimp.com/developer/transactional/api/inbound/delete-domain/
        const response = await nango.post({
            endpoint: '/1.0/inbound/delete-domain',
            data: {
                domain: input.domain
            },
            retries: 1
        });

        if (response.data && typeof response.data === 'object' && 'status' in response.data && response.data.status === 'error') {
            const errorRecord: Record<string, unknown> = response.data;
            const errorName = typeof errorRecord['name'] === 'string' ? errorRecord['name'] : 'api_error';
            const errorMessage = typeof errorRecord['message'] === 'string' ? errorRecord['message'] : 'Inbound domain deletion failed';
            throw new nango.ActionError({
                type: errorName,
                message: errorMessage
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            domain: providerResponse.domain,
            ...(providerResponse.created_at !== undefined && {
                created_at: providerResponse.created_at
            }),
            ...(providerResponse.valid_mx !== undefined && {
                valid_mx: providerResponse.valid_mx
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
