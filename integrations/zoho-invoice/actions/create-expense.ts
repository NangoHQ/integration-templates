import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z.string().describe('ID of the Zoho organization the expense belongs to. Required by every Zoho Invoice endpoint.'),
        account_id: z.string().describe('ID of an existing chart-of-accounts expense category. Must reference a valid expense account.'),
        date: z.string().describe('Date of the expense in yyyy-mm-dd format.'),
        amount: z.number().describe('Total expense amount.'),
        reference_number: z.string().optional().describe('Reference number for the expense. Maximum length 100.'),
        description: z.string().optional().describe('Description of the expense. Maximum length 100.'),
        customer_id: z.string().optional().describe('ID of the customer to bill the expense to. Providing it marks the expense as billable.'),
        is_billable: z.boolean().optional().describe('Whether the expense is billable. Defaults to false.')
    })
    .describe('Fields used to record a new expense in Zoho Invoice.');

const ProviderExpenseSchema = z.object({
    expense_id: z.string(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    date: z.string().optional(),
    amount: z.number().optional(),
    total: z.number().optional(),
    bcy_total: z.number().optional(),
    reference_number: z.string().optional(),
    description: z.string().optional(),
    is_billable: z.boolean().optional(),
    is_personal: z.boolean().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    status: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    last_modified_time: z.string().optional()
});

const CreateExpenseResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    expense: ProviderExpenseSchema
});

const OutputSchema = z
    .object({
        expense_id: z.string().describe('Unique ID of the created expense.'),
        account_id: z.string().optional().describe('ID of the expense account the expense was recorded under.'),
        account_name: z.string().optional().describe('Name of the expense account the expense was recorded under.'),
        date: z.string().optional().describe('Date of the expense in yyyy-mm-dd format.'),
        amount: z.number().optional().describe('Total expense amount.'),
        total: z.number().optional().describe('Total value of the expense.'),
        bcy_total: z.number().optional().describe('Total value of the expense in the organization base currency.'),
        reference_number: z.string().optional().describe('Reference number stored on the expense.'),
        description: z.string().optional().describe('Description stored on the expense.'),
        is_billable: z.boolean().optional().describe('Whether the expense is billable.'),
        is_personal: z.boolean().optional().describe('Whether the expense is personal.'),
        customer_id: z.string().optional().describe('ID of the customer the expense is billable to, if any.'),
        customer_name: z.string().optional().describe('Name of the customer the expense is billable to, if any.'),
        status: z.string().optional().describe('Expense status, for example "nonbillable" or "unbilled".'),
        currency_id: z.string().optional().describe('Unique ID of the expense currency.'),
        currency_code: z.string().optional().describe('Currency code of the expense.'),
        last_modified_time: z.string().optional().describe('Timestamp of the last modification to the expense.')
    })
    .describe('The expense record that Zoho Invoice created.');

/**
 * @tags: [write]
 * @tagReason: Creates a new expense record in the provider.
 * @pitfalls: account_id must be an existing expense account (chart of accounts); there is no in-scope endpoint to list valid IDs, so callers must supply one, and an invalid or empty value is rejected by the provider.
 */
const action = createAction({
    description: 'Record a new expense.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.expenses.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.zoho.com/invoice/api/v3/expenses/#create-an-expense
            endpoint: '/invoice/v3/expenses',
            params: {
                organization_id: input.organization_id
            },
            data: {
                account_id: input.account_id,
                date: input.date,
                amount: input.amount,
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
                ...(input.is_billable !== undefined && { is_billable: input.is_billable })
            },
            // Expense creation is not idempotent and Zoho has no idempotency key, so a retry after a lost response could record a duplicate expense.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- deliberate retries: 0 for a non-idempotent create.
            retries: 0
        });

        const parsed = CreateExpenseResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Zoho Invoice returned an unexpected response when creating the expense.'
            });
        }

        const expense = parsed.data.expense;

        return {
            expense_id: expense.expense_id,
            ...(expense.account_id !== undefined && { account_id: expense.account_id }),
            ...(expense.account_name !== undefined && { account_name: expense.account_name }),
            ...(expense.date !== undefined && { date: expense.date }),
            ...(expense.amount !== undefined && { amount: expense.amount }),
            ...(expense.total !== undefined && { total: expense.total }),
            ...(expense.bcy_total !== undefined && { bcy_total: expense.bcy_total }),
            ...(expense.reference_number !== undefined && { reference_number: expense.reference_number }),
            ...(expense.description !== undefined && { description: expense.description }),
            ...(expense.is_billable !== undefined && { is_billable: expense.is_billable }),
            ...(expense.is_personal !== undefined && { is_personal: expense.is_personal }),
            ...(expense.customer_id !== undefined && { customer_id: expense.customer_id }),
            ...(expense.customer_name !== undefined && { customer_name: expense.customer_name }),
            ...(expense.status !== undefined && { status: expense.status }),
            ...(expense.currency_id !== undefined && { currency_id: expense.currency_id }),
            ...(expense.currency_code !== undefined && { currency_code: expense.currency_code }),
            ...(expense.last_modified_time !== undefined && { last_modified_time: expense.last_modified_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
