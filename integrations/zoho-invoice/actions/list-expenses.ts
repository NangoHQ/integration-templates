import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z.string().describe('ID of the Zoho organization to list expenses for. Example: "927270289"'),
        customer_id: z.string().optional().describe('Filter expenses by the Zoho contact (customer) ID. Example: "260815000000097001"'),
        last_modified_time: z
            .string()
            .optional()
            .describe(
                'ISO-8601 timestamp with a numeric timezone offset; only expenses modified at or after this time are returned. Example: "2026-10-01T00:00:00+0000"'
            ),
        page: z.number().int().positive().optional().describe('Page number to fetch, starting at 1. Defaults to 1.'),
        per_page: z.number().int().positive().optional().describe('Number of expenses per page. Provider default and maximum is 200.')
    })
    .describe('Filters for listing Zoho expenses, including optional customer, last-modified, and pagination options.');

const CustomFieldSchema = z.object({
    customfield_id: z.string().optional().describe('Unique ID of the custom field.'),
    value: z.string().optional().describe('Value stored in the custom field for this expense.')
});

const ExpenseSchema = z
    .object({
        expense_id: z.string().describe('Unique ID of the expense.'),
        date: z.string().optional().describe('Expense date, in the provider format (yyyy-mm-dd).'),
        user_name: z.string().optional().describe('Name of the user the expense belongs to.'),
        account_name: z.string().optional().describe('Name of the expense account/category (the account ID is not exposed by the list view).'),
        description: z.string().optional().describe('Description of the expense.'),
        currency_id: z.string().optional().describe('Unique ID of the expense currency.'),
        currency_code: z.string().optional().describe('ISO currency code of the expense. Example: "INR"'),
        bcy_total: z.number().optional().describe('Total expense amount in the organization base currency.'),
        bcy_total_without_tax: z.number().optional().describe('Total expense amount in the base currency, excluding tax.'),
        total: z.number().optional().describe('Total expense amount in the expense currency.'),
        total_without_tax: z.number().optional().describe('Expense total in the expense currency, excluding tax.'),
        is_billable: z.boolean().optional().describe('Whether the expense is billable to a customer.'),
        reference_number: z.string().optional().describe('Reference number of the expense.'),
        customer_id: z.string().optional().describe('ID of the customer associated with the expense. Empty when not customer-specific.'),
        is_personal: z.boolean().optional().describe('Whether the expense is personal rather than business.'),
        customer_name: z.string().optional().describe('Name of the customer associated with the expense.'),
        status: z.string().optional().describe('Expense status. Example: "unbilled", "invoiced", "reimbursed".'),
        created_time: z.string().optional().describe('Time the expense was created, in ISO-8601 format.'),
        last_modified_time: z.string().optional().describe('Time the expense was last modified, in ISO-8601 format.'),
        expense_receipt_name: z.string().optional().describe('Filename of the attached expense receipt, if any.'),
        exchange_rate: z.number().optional().describe('Foreign currency exchange rate applied to the expense.'),
        distance: z.number().optional().describe('Distance travelled for a mileage expense.'),
        mileage_rate: z.number().optional().describe('Mileage rate applied to a mileage expense.'),
        mileage_unit: z.string().optional().describe('Unit of distance for a mileage expense. Example: "km", "mile"'),
        mileage_type: z.string().optional().describe('Mileage expense type. Example: "non_mileage", "odometer", "manual"'),
        expense_type: z.string().optional().describe('Type of the expense. Example: "non_mileage"'),
        report_id: z.string().optional().describe('ID of the expense report the expense belongs to, if any.'),
        report_name: z.string().optional().describe('Name of the expense report the expense belongs to, if any.'),
        report_number: z.string().optional().describe('Number of the expense report the expense belongs to, if any.'),
        start_reading: z.string().optional().describe('Odometer start reading for an odometer mileage expense.'),
        end_reading: z.string().optional().describe('Odometer end reading for an odometer mileage expense.'),
        has_attachment: z.boolean().optional().describe('Whether the expense has an attached receipt.'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom field values configured for expenses in the organization.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        expenses: z.array(ExpenseSchema).describe('Expenses matching the requested filters.'),
        page: z.number().optional().describe('Page number of the returned results.'),
        per_page: z.number().optional().describe('Number of records requested per page.'),
        has_more_page: z.boolean().optional().describe('Whether more pages of expenses are available.'),
        next_page: z.number().optional().describe('Page number to request next; present only when more pages are available.')
    })
    .describe('Expenses matching the filters, along with pagination details for fetching further pages.');

const PageContextSchema = z
    .object({
        page: z.number().optional(),
        per_page: z.number().optional(),
        has_more_page: z.boolean().optional()
    })
    .passthrough();

const ListExpensesResponseSchema = z
    .object({
        code: z.number().optional(),
        message: z.string().optional(),
        expenses: z.array(z.unknown()).optional(),
        page_context: PageContextSchema.optional()
    })
    .passthrough();

/**
 * @tags: [read]
 * @tagReason: Lists expenses from the provider without creating, updating, or deleting any provider data.
 * @pitfalls: Requires a valid organization_id and cannot discover it from this connection's scopes, so omitting it returns Zoho error code 9017. customer_id must be a Zoho contact ID, not a name. last_modified_time only accepts an ISO-8601 timestamp with a numeric offset (e.g. 2026-10-01T00:00:00+0000). Results are capped at per_page (default 200); the list view exposes account_name but not account_id.
 */
const action = createAction({
    description: 'List expenses, with optional customer and last-modified filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.expenses.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/invoice/api/v3/expenses/#list-expenses
            endpoint: '/invoice/v3/expenses',
            params: {
                organization_id: input.organization_id,
                ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
                ...(input.last_modified_time !== undefined && { last_modified_time: input.last_modified_time }),
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        const parsed = ListExpensesResponseSchema.parse(response.data);
        const pageContext = parsed.page_context;

        return {
            expenses: (parsed.expenses ?? []).map((expense) => ExpenseSchema.parse(expense)),
            ...(pageContext?.page !== undefined && { page: pageContext.page }),
            ...(pageContext?.per_page !== undefined && { per_page: pageContext.per_page }),
            ...(pageContext?.has_more_page !== undefined && { has_more_page: pageContext.has_more_page }),
            ...(pageContext?.has_more_page === true && pageContext?.page !== undefined && { next_page: pageContext.page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
