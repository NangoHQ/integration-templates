import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Account ID. Example: 1')
});

const ProviderResponseSchema = z.object({
    meta: z
        .object({
            success: z.boolean().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.number()
});

const action = createAction({
    description: 'Delete or archive an account in ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-account',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.activecampaign.com/reference/delete-an-account
            endpoint: `/3/accounts/${encodeURIComponent(String(input.id))}`,
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.meta?.success ?? true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
