import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z
    .object({
        line_item_id: z.string().optional().describe('Unique identifier of an existing expense line item to update. Example: "260815000000166018"'),
        account_id: z.string().optional().describe('ID of the expense account for this line item. Example: "260815000000000400"'),
        description: z.string().optional().describe('Description of the expense line item. Max-length [100]'),
        amount: z.number().optional().describe('Amount of the line item. Example: 55.0'),
        tax_id: z.string().optional().describe('ID of the tax applied to this line item. Example: "260815000000000097"')
    })
    .describe('A single expense line item to set on the expense.');

const CustomFieldInputSchema = z
    .object({
        customfield_id: z.string().optional().describe('Unique identifier of the custom field. Example: "46000000012845"'),
        value: z.string().optional().describe('Value to store in the custom field.')
    })
    .describe('A custom field value to set on the expense.');

const InputSchema = z
    .object({
        expense_id: z.string().describe('Unique identifier of the expense to update. Example: "260815000000166011"'),
        organization_id: z
            .string()
            .describe(
                'Zoho Invoice organization ID. This connection cannot look it up automatically, so it is required and must be supplied by the caller; omitting it makes the provider reject the request.'
            ),
        account_id: z.string().optional().describe('ID of the expense account (chart of accounts category). Example: "260815000000000400"'),
        date: z.string().optional().describe('Date of the expense in YYYY-MM-DD format. Example: "2026-10-09"'),
        amount: z.number().optional().describe('Total expense value. Example: 55.0'),
        tax_id: z.string().optional().describe('ID of the tax applied to the expense. Example: "260815000000000097"'),
        description: z.string().optional().describe('Description of the expense. Max-length [100]'),
        reference_number: z.string().optional().describe('Reference number of the expense. Max-length [100]'),
        is_billable: z.boolean().optional().describe('Whether the expense is billable to the customer.'),
        customer_id: z.string().optional().describe('ID of the customer to bill the expense to. Example: "260815000000097001"'),
        currency_id: z.string().optional().describe('Unique identifier of the currency. Example: "260815000000000097"'),
        exchange_rate: z.number().optional().describe('Exchange rate of the expense currency against the base currency.'),
        project_id: z.string().optional().describe('ID of the project associated with the expense.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether the amount is inclusive of tax.'),
        line_items: z.array(LineItemInputSchema).optional().describe('Line items to set on the expense.'),
        custom_fields: z.array(CustomFieldInputSchema).optional().describe('Custom field values to set on the expense.')
    })
    .describe('Input for updating an existing Zoho Invoice expense.');

const ProviderExpenseSchema = z
    .object({
        expense_id: z.string(),
        date: z.string().nullish(),
        amount: z.number().nullish(),
        description: z.string().nullish(),
        reference_number: z.string().nullish(),
        status: z.string().nullish(),
        account_id: z.string().nullish(),
        account_name: z.string().nullish(),
        customer_id: z.string().nullish(),
        customer_name: z.string().nullish(),
        currency_id: z.string().nullish(),
        currency_code: z.string().nullish(),
        exchange_rate: z.number().nullish(),
        project_id: z.string().nullish(),
        project_name: z.string().nullish(),
        is_billable: z.boolean().nullish(),
        is_personal: z.boolean().nullish(),
        is_inclusive_tax: z.boolean().nullish(),
        tax_id: z.string().nullish(),
        tax_name: z.string().nullish(),
        tax_percentage: z.number().nullish(),
        sub_total: z.number().nullish(),
        total: z.number().nullish(),
        bcy_total: z.number().nullish(),
        tax_amount: z.number().nullish()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    expense: ProviderExpenseSchema.optional()
});

const OutputSchema = z
    .object({
        expense_id: z.string().describe('Unique identifier of the updated expense.'),
        date: z.string().optional().describe('Date of the expense in YYYY-MM-DD format.'),
        amount: z.number().optional().describe('Total expense value.'),
        description: z.string().optional().describe('Description of the expense.'),
        reference_number: z.string().optional().describe('Reference number of the expense.'),
        status: z.string().optional().describe('Expense status, e.g. "nonbillable", "unbilled", "billable" or "invoiced".'),
        account_id: z.string().optional().describe('ID of the expense account.'),
        account_name: z.string().optional().describe('Name of the expense account.'),
        customer_id: z.string().optional().describe('ID of the customer billed for the expense.'),
        customer_name: z.string().optional().describe('Name of the customer billed for the expense.'),
        currency_id: z.string().optional().describe('Unique identifier of the expense currency.'),
        currency_code: z.string().optional().describe('Code of the expense currency, e.g. "USD".'),
        exchange_rate: z.number().optional().describe('Exchange rate of the expense currency against the base currency.'),
        project_id: z.string().optional().describe('ID of the project associated with the expense.'),
        project_name: z.string().optional().describe('Name of the project associated with the expense.'),
        is_billable: z.boolean().optional().describe('Whether the expense is billable to the customer.'),
        is_personal: z.boolean().optional().describe('Whether the expense is a personal expense.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether the amount is inclusive of tax.'),
        tax_id: z.string().optional().describe('ID of the tax applied to the expense.'),
        tax_name: z.string().optional().describe('Name of the tax applied to the expense.'),
        tax_percentage: z.number().optional().describe('Percentage of the tax applied to the expense.'),
        sub_total: z.number().optional().describe('Sub-total of the expense before tax.'),
        total: z.number().optional().describe('Total value of the expense.'),
        bcy_total: z.number().optional().describe('Total value of the expense in the base currency.'),
        tax_amount: z.number().optional().describe('Total tax amount on the expense.')
    })
    .describe('The updated Zoho Invoice expense.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing expense's fields through a provider PUT; it performs no provider reads and has no destructive or hard-to-reverse effect.
 * @pitfalls: organization_id is required — this connection cannot discover it and omitting it makes the provider reject the call; account_id must be a valid expense account, which this connection cannot list.
 */
const action = createAction({
    description: 'Update an existing expense in Zoho Invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.expenses.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateBody: Record<string, unknown> = {
            ...(input.account_id !== undefined && { account_id: input.account_id }),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.amount !== undefined && { amount: input.amount }),
            ...(input.tax_id !== undefined && { tax_id: input.tax_id }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.is_billable !== undefined && { is_billable: input.is_billable }),
            ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
            ...(input.currency_id !== undefined && { currency_id: input.currency_id }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
            ...(input.project_id !== undefined && { project_id: input.project_id }),
            ...(input.is_inclusive_tax !== undefined && { is_inclusive_tax: input.is_inclusive_tax }),
            ...(input.line_items !== undefined && { line_items: input.line_items }),
            ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields })
        };

        const response = await nango.put({
            // https://www.zoho.com/invoice/api/v3/expenses/#update-an-expense
            endpoint: `/invoice/v3/expenses/${encodeURIComponent(input.expense_id)}`,
            params: {
                organization_id: input.organization_id
            },
            data: updateBody,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'provider_response_error',
                message: 'Unexpected response from Zoho Invoice API.',
                details: providerResponse.error.message
            });
        }

        if (providerResponse.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.data.message
            });
        }

        const expense = providerResponse.data.expense;

        if (!expense) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider did not return an expense object.'
            });
        }

        return {
            expense_id: expense.expense_id,
            ...(expense.date != null && { date: expense.date }),
            ...(expense.amount != null && { amount: expense.amount }),
            ...(expense.description != null && { description: expense.description }),
            ...(expense.reference_number != null && { reference_number: expense.reference_number }),
            ...(expense.status != null && { status: expense.status }),
            ...(expense.account_id != null && { account_id: expense.account_id }),
            ...(expense.account_name != null && { account_name: expense.account_name }),
            ...(expense.customer_id != null && { customer_id: expense.customer_id }),
            ...(expense.customer_name != null && { customer_name: expense.customer_name }),
            ...(expense.currency_id != null && { currency_id: expense.currency_id }),
            ...(expense.currency_code != null && { currency_code: expense.currency_code }),
            ...(expense.exchange_rate != null && { exchange_rate: expense.exchange_rate }),
            ...(expense.project_id != null && { project_id: expense.project_id }),
            ...(expense.project_name != null && { project_name: expense.project_name }),
            ...(expense.is_billable != null && { is_billable: expense.is_billable }),
            ...(expense.is_personal != null && { is_personal: expense.is_personal }),
            ...(expense.is_inclusive_tax != null && { is_inclusive_tax: expense.is_inclusive_tax }),
            ...(expense.tax_id != null && { tax_id: expense.tax_id }),
            ...(expense.tax_name != null && { tax_name: expense.tax_name }),
            ...(expense.tax_percentage != null && { tax_percentage: expense.tax_percentage }),
            ...(expense.sub_total != null && { sub_total: expense.sub_total }),
            ...(expense.total != null && { total: expense.total }),
            ...(expense.bcy_total != null && { bcy_total: expense.bcy_total }),
            ...(expense.tax_amount != null && { tax_amount: expense.tax_amount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
