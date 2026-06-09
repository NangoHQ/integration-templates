import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    account_id: z.string().describe('The ID of the bank account to delete. Example: "260815000000110010"')
});

const ProviderResponseSchema = z
    .object({
        code: z.number().optional(),
        message: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete a bank account in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-bank-account',
        group: 'Bank Accounts'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.zoho.com/books/api/v3/bankaccounts/#delete-a-bank-account
            endpoint: `/books/v3/bankaccounts/${encodeURIComponent(input.account_id)}`,
            params: {
                organization_id: '927270289'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.code === 0 || response.status === 200,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
