import { createAction, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InputSchema = z
    .object({
        expense_id: z.string().describe('Unique ID of the expense to delete. Example: "260815000000164012".'),
        organization_id: z.string().describe('ID of the Zoho Invoice organization the expense belongs to. Example: "927270289".')
    })
    .describe('Identifies the expense to delete and the organization it belongs to.');

const DeleteExpenseResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether Zoho Invoice confirmed the expense was deleted (true when the provider returned code 0).'),
        message: z.string().describe('Confirmation message returned by Zoho Invoice. Example: "The expense has been deleted.".')
    })
    .describe('Result of the expense deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes an expense record in Zoho Invoice, a hard-to-reverse provider mutation.
 * @pitfalls: An expense that has already been converted to an invoice cannot be deleted and the call fails; deleting an expense that does not exist also fails rather than succeeding as a no-op.
 */
const action = createAction({
    description: 'Delete an expense',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.expenses.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.zoho.com/invoice/api/v3/expenses/
            endpoint: `/invoice/v3/expenses/${encodeURIComponent(input.expense_id)}`,
            params: {
                organization_id: input.organization_id
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Deleting is not idempotent against this API: retrying after a lost response returns "Expense does not exist" and would surface as a spurious failure.
            retries: 0
        };

        const response = await nango.delete(config);

        const parsed = DeleteExpenseResponseSchema.parse(response.data);

        return {
            success: parsed.code === 0,
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
