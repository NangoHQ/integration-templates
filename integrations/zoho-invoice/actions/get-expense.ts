import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        expense_id: z.string().describe('Unique ID of the expense to retrieve. Example: "982000000030049"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'ID of the Zoho organization the expense belongs to. Required in practice for this connection because its scopes cannot look up organizations.'
            )
    })
    .describe('Input for retrieving a single Zoho Invoice expense by ID.');

const ProviderLineItemSchema = z.object({
    line_item_id: z.string().nullable().optional(),
    account_id: z.string().nullable().optional(),
    account_name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    amount: z.number().nullable().optional(),
    item_total: z.number().nullable().optional(),
    tax_amount: z.number().nullable().optional(),
    tax_id: z.string().nullable().optional(),
    tax_name: z.string().nullable().optional(),
    tax_percentage: z.number().nullable().optional()
});

const ProviderCustomFieldSchema = z.object({
    customfield_id: z.string().nullable().optional(),
    value: z.string().nullable().optional()
});

const ProviderExpenseSchema = z.object({
    expense_id: z.string(),
    account_id: z.string(),
    account_name: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    expense_type: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    reference_number: z.string().nullable().optional(),
    currency_id: z.string().nullable().optional(),
    currency_code: z.string().nullable().optional(),
    exchange_rate: z.number().nullable().optional(),
    sub_total: z.number().nullable().optional(),
    total: z.number().nullable().optional(),
    bcy_total: z.number().nullable().optional(),
    amount: z.number().nullable().optional(),
    tax_amount: z.number().nullable().optional(),
    is_inclusive_tax: z.boolean().nullable().optional(),
    is_billable: z.boolean().nullable().optional(),
    is_personal: z.boolean().nullable().optional(),
    customer_id: z.string().nullable().optional(),
    customer_name: z.string().nullable().optional(),
    project_id: z.string().nullable().optional(),
    project_name: z.string().nullable().optional(),
    invoice_id: z.string().nullable().optional(),
    invoice_number: z.string().nullable().optional(),
    expense_receipt_name: z.string().nullable().optional(),
    payment_mode: z.string().nullable().optional(),
    created_time: z.string().nullable().optional(),
    last_modified_time: z.string().nullable().optional(),
    line_items: z.array(ProviderLineItemSchema).nullable().optional(),
    custom_fields: z.array(ProviderCustomFieldSchema).nullable().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    expense: ProviderExpenseSchema.optional()
});

const LineItemSchema = z.object({
    line_item_id: z.string().optional().describe('Unique ID of the expense line item.'),
    account_id: z.string().optional().describe('ID of the expense account (category) for this line item.'),
    account_name: z.string().optional().describe('Name of the expense account (category) for this line item.'),
    description: z.string().optional().describe('Description of the line item.'),
    amount: z.number().optional().describe('Line item amount.'),
    item_total: z.number().optional().describe('Total amount for the line item, including tax.'),
    tax_amount: z.number().optional().describe('Tax amount applied to the line item.'),
    tax_id: z.string().optional().describe('ID of the tax applied to the line item.'),
    tax_name: z.string().optional().describe('Name of the tax applied to the line item.'),
    tax_percentage: z.number().optional().describe('Tax percentage applied to the line item.')
});

const CustomFieldSchema = z.object({
    customfield_id: z.string().optional().describe('Unique ID of the custom field.'),
    value: z.string().optional().describe('Value of the custom field.')
});

const OutputSchema = z
    .object({
        expense_id: z.string().describe('Unique ID of the expense.'),
        account_id: z.string().describe('ID of the expense account (category) the expense is recorded under.'),
        account_name: z.string().optional().describe('Name of the expense account (category) the expense is recorded under.'),
        date: z.string().optional().describe('Date of the expense in yyyy-mm-dd format.'),
        status: z.string().optional().describe('Expense status, such as "unbilled", "invoiced", "reimbursed" or "nonbillable".'),
        expense_type: z.string().optional().describe('Type of the expense, such as "non_mileage".'),
        description: z.string().optional().describe('Description of the expense.'),
        reference_number: z.string().optional().describe('Reference number of the expense.'),
        currency_id: z.string().optional().describe('Unique ID of the expense currency.'),
        currency_code: z.string().optional().describe('ISO code of the expense currency. Example: "USD"'),
        exchange_rate: z.number().optional().describe('Foreign currency exchange rate applied to the expense.'),
        sub_total: z.number().optional().describe('Sub-total of the expense amount before tax.'),
        total: z.number().optional().describe('Total value of the expense in the expense currency.'),
        bcy_total: z.number().optional().describe('Total value of the expense in the organization base currency.'),
        amount: z.number().optional().describe('Total expense value.'),
        tax_amount: z.number().optional().describe('Total tax amount applied to the expense.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether the expense amount is inclusive of tax.'),
        is_billable: z.boolean().optional().describe('Whether the expense is billable to a customer.'),
        is_personal: z.boolean().optional().describe('Whether the expense is marked as personal.'),
        customer_id: z.string().optional().describe('ID of the customer associated with the expense, when billable.'),
        customer_name: z.string().optional().describe('Name of the customer associated with the expense, when billable.'),
        project_id: z.string().optional().describe('ID of the project associated with the expense.'),
        project_name: z.string().optional().describe('Name of the project associated with the expense.'),
        invoice_id: z.string().optional().describe('ID of the invoice the expense has been billed on, if any.'),
        invoice_number: z.string().optional().describe('Serial number of the invoice the expense has been billed on, if any.'),
        expense_receipt_name: z.string().optional().describe('Name of the attached expense receipt file, if any.'),
        payment_mode: z.string().optional().describe('Payment mode used for the expense. Example: "Cash"'),
        created_time: z.string().optional().describe('Timestamp when the expense was created.'),
        last_modified_time: z.string().optional().describe('Timestamp when the expense was last modified.'),
        line_items: z.array(LineItemSchema).optional().describe('Line items that make up the expense.'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom field values recorded on the expense.')
    })
    .describe('A single Zoho Invoice expense, including its account (expense category) ID.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single expense record from the provider without mutating any data.
 * @pitfalls: organization_id must be supplied explicitly because this connection's scopes cannot look up organizations; account_id (the expense category) is only returned here, as expense list results omit it; unset text fields come back as empty strings rather than being omitted.
 */
const action = createAction({
    description: 'Get a single expense by ID, including its account (expense category) ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.expenses.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/invoice/api/v3/expenses/#get-an-expense
            endpoint: `/invoice/v3/expenses/${encodeURIComponent(input.expense_id)}`,
            params: {
                ...(input.organization_id !== undefined && { organization_id: input.organization_id })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Expense not found',
                expense_id: input.expense_id
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        if (!parsed.expense) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Expense not found',
                expense_id: input.expense_id
            });
        }

        const expense = parsed.expense;

        return {
            expense_id: expense.expense_id,
            account_id: expense.account_id,
            ...(expense.account_name != null && { account_name: expense.account_name }),
            ...(expense.date != null && { date: expense.date }),
            ...(expense.status != null && { status: expense.status }),
            ...(expense.expense_type != null && { expense_type: expense.expense_type }),
            ...(expense.description != null && { description: expense.description }),
            ...(expense.reference_number != null && { reference_number: expense.reference_number }),
            ...(expense.currency_id != null && { currency_id: expense.currency_id }),
            ...(expense.currency_code != null && { currency_code: expense.currency_code }),
            ...(expense.exchange_rate != null && { exchange_rate: expense.exchange_rate }),
            ...(expense.sub_total != null && { sub_total: expense.sub_total }),
            ...(expense.total != null && { total: expense.total }),
            ...(expense.bcy_total != null && { bcy_total: expense.bcy_total }),
            ...(expense.amount != null && { amount: expense.amount }),
            ...(expense.tax_amount != null && { tax_amount: expense.tax_amount }),
            ...(expense.is_inclusive_tax != null && { is_inclusive_tax: expense.is_inclusive_tax }),
            ...(expense.is_billable != null && { is_billable: expense.is_billable }),
            ...(expense.is_personal != null && { is_personal: expense.is_personal }),
            ...(expense.customer_id != null && { customer_id: expense.customer_id }),
            ...(expense.customer_name != null && { customer_name: expense.customer_name }),
            ...(expense.project_id != null && { project_id: expense.project_id }),
            ...(expense.project_name != null && { project_name: expense.project_name }),
            ...(expense.invoice_id != null && { invoice_id: expense.invoice_id }),
            ...(expense.invoice_number != null && { invoice_number: expense.invoice_number }),
            ...(expense.expense_receipt_name != null && { expense_receipt_name: expense.expense_receipt_name }),
            ...(expense.payment_mode != null && { payment_mode: expense.payment_mode }),
            ...(expense.created_time != null && { created_time: expense.created_time }),
            ...(expense.last_modified_time != null && { last_modified_time: expense.last_modified_time }),
            ...(expense.line_items != null && {
                line_items: expense.line_items.map((item) => ({
                    ...(item.line_item_id != null && { line_item_id: item.line_item_id }),
                    ...(item.account_id != null && { account_id: item.account_id }),
                    ...(item.account_name != null && { account_name: item.account_name }),
                    ...(item.description != null && { description: item.description }),
                    ...(item.amount != null && { amount: item.amount }),
                    ...(item.item_total != null && { item_total: item.item_total }),
                    ...(item.tax_amount != null && { tax_amount: item.tax_amount }),
                    ...(item.tax_id != null && { tax_id: item.tax_id }),
                    ...(item.tax_name != null && { tax_name: item.tax_name }),
                    ...(item.tax_percentage != null && { tax_percentage: item.tax_percentage })
                }))
            }),
            ...(expense.custom_fields != null && {
                custom_fields: expense.custom_fields.map((field) => ({
                    ...(field.customfield_id != null && { customfield_id: field.customfield_id }),
                    ...(field.value != null && { value: field.value })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
