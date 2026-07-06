import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Expense ID. Example: "2420459"')
});

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const ProviderExpenseSchema = z.object({
    id: z.number(),
    vis_state: z.number().optional()
});

const ProviderResponseSchema = z.object({
    response: z.object({
        result: z.object({
            expense: ProviderExpenseSchema
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    vis_state: z.number().optional()
});

const action = createAction({
    description: 'Archive (soft-delete) an expense.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:expenses:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }

        const accountId = parsedMetadata.data.accountId;

        // https://www.freshbooks.com/api
        const response = await nango.put({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/expenses/expenses/${encodeURIComponent(input.id)}`,
            data: {
                expense: {
                    vis_state: 1
                }
            },
            retries: 1
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Failed to parse expense response.',
                raw: response.data
            });
        }

        const expense = parsedResponse.data.response.result.expense;

        return {
            id: String(expense.id),
            ...(expense.vis_state !== undefined && { vis_state: expense.vis_state })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
