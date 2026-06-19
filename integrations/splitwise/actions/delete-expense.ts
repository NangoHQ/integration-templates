import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    expense_id: z.number().describe('ID of the expense to delete. Example: 51023')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    errors: z.record(z.string(), z.array(z.string())).optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    expense_id: z.number(),
    archived: z.boolean()
});

const action = createAction({
    description: 'Delete or archive an expense in Splitwise.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://dev.splitwise.com/#tag/expenses/paths/~1delete_expense~1%7Bid%7D/post
            endpoint: `/api/v3.0/delete_expense/${encodeURIComponent(String(input.expense_id))}`,
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            const errorMessages = providerResponse.errors ? Object.values(providerResponse.errors).flat().join('; ') : 'Unknown error';
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete expense: ${errorMessages}`,
                expense_id: input.expense_id
            });
        }

        return {
            success: true,
            expense_id: input.expense_id,
            archived: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
