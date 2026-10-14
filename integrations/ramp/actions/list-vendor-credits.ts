import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z
    .object({
        amount: z.number().int().describe('Amount in the smallest currency unit (for example cents when currency_code is USD).'),
        currency_code: z.string().describe('ISO 4217 currency code of the amount. Example: "USD".'),
        minor_unit_conversion_rate: z
            .number()
            .int()
            .nullable()
            .describe('Divisor used to convert amount back to major units (100 for USD). Null when the provider cannot supply it.')
    })
    .describe('A monetary amount expressed in the smallest currency unit.');

const AccountingFieldSchema = z
    .object({
        external_id: z.string().describe('External identifier of the accounting field in the ERP.'),
        id: z.string().describe('Ramp identifier of the accounting field.'),
        name: z.string().describe('Name of the accounting field.'),
        type: z.string().describe('Accounting field type. Example: "GL_ACCOUNT".')
    })
    .describe('Accounting field (category) metadata for an accounting field selection.');

const AccountingFieldSelectionSchema = z
    .object({
        category_info: AccountingFieldSchema.describe('The accounting category (field) the selected option belongs to.'),
        display_name: z.string().nullable().describe('Ramp-side display name for the selected option; null when no override is set.'),
        external_code: z.string().nullable().optional().describe('ERP code of the selected option; null or omitted when the provider does not return one.'),
        external_id: z.string().describe('External identifier of the selected accounting field option.'),
        id: z.string().describe('Ramp identifier of the selected accounting field option.'),
        name: z.string().describe('ERP source name of the selected accounting field option.'),
        provider_name: z.string().nullable().describe('Name of the accounting provider; null when unavailable.')
    })
    .describe('An accounting field option selected on the vendor credit.');

const AppliedBillSchema = z
    .object({
        amount: CurrencyAmountSchema.describe('Amount of the vendor credit applied to this document.'),
        bill_id: z.string().describe('UUID of the bill or draft bill the credit is applied to.')
    })
    .describe('A bill or draft bill the vendor credit has been applied to.');

const ExpenseLineItemSchema = z
    .object({
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field options selected to code this line item.'),
        amount: CurrencyAmountSchema.describe('Line item amount.'),
        memo: z.string().optional().describe('Free-text memo for the line item.')
    })
    .describe('An expense line item on the vendor credit (an overall amount).');

const InventoryLineItemSchema = z
    .object({
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field options selected to code this line item.'),
        amount: CurrencyAmountSchema.describe('Line item amount, equal to unit_quantity multiplied by unit_price.'),
        memo: z.string().optional().describe('Free-text memo for the line item.'),
        unit_price: CurrencyAmountSchema.describe('Unit price of the line item.'),
        unit_quantity: z.number().int().describe('Number of units in the line item.')
    })
    .describe('An inventory line item on the vendor credit (tied to a good or service).');

const VendorCreditSchema = z
    .object({
        id: z.string().describe('Unique identifier of the vendor credit.'),
        accounting_date: z.string().describe('Accounting date of the vendor credit, formatted as YYYY-MM-DD.'),
        archived_at: z.string().nullable().describe('Archive timestamp in ISO 8601; null for active credits. Archived credits cannot be applied to bills.'),
        created_at: z.string().nullable().describe('Creation timestamp in ISO 8601; null when the provider cannot supply it.'),
        entity_id: z.string().nullable().describe('UUID of the business entity the credit belongs to; null when unavailable.'),
        vendor_id: z.string().describe('UUID of the vendor (payee) that issued the credit.'),
        reference_bill_id: z.string().nullable().describe('UUID of the bill this credit originated from; null when not tied to a bill.'),
        reference_number: z.string().nullable().describe('Reference number from the vendor credit memo; null when absent.'),
        total_amount: CurrencyAmountSchema.describe('Total credit amount, the sum of all line items.'),
        total_applied_amount: CurrencyAmountSchema.describe('Total amount already applied to bills and/or draft bills.'),
        remaining_amount: CurrencyAmountSchema.describe('Unapplied amount (total_amount minus total_applied_amount); retained for archived credits.'),
        applied_bills: z.array(AppliedBillSchema).describe('Bills this vendor credit has been applied to.'),
        applied_draft_bills: z.array(AppliedBillSchema).describe('Draft bills this vendor credit has been applied to.'),
        expense_line_items: z.array(ExpenseLineItemSchema).describe('Expense line items of the vendor credit.'),
        inventory_line_items: z.array(InventoryLineItemSchema).describe('Inventory line items of the vendor credit.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field selections applied to the vendor credit as a whole.')
    })
    .describe('A vendor credit issued by a vendor, applicable against future bills.');

const InputSchema = z
    .object({
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe('Opaque pagination cursor taken from `next_cursor` of a previous response. Omit to fetch the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of credits to return per page, from 2 to 100. Defaults to 20 when omitted.'),
        entity_id: z.string().optional().describe('Filter to credits belonging to this business entity UUID.'),
        from_created_at: z.string().optional().describe('Only return credits created on or after this ISO 8601 datetime. Example: "2024-01-01T00:00:00Z".'),
        to_created_at: z.string().optional().describe('Only return credits created on or before this ISO 8601 datetime. Example: "2024-12-31T23:59:59Z".'),
        from_accounting_date: z.string().optional().describe('Only return credits with an accounting date on or after this date. Example: "2024-01-01".'),
        to_accounting_date: z.string().optional().describe('Only return credits with an accounting date on or before this date. Example: "2024-12-31".'),
        include_fully_used: z.boolean().optional().describe('When true, also return credits that have been fully used. Defaults to false.'),
        is_archived: z.boolean().optional().describe('When true, return visible archived credits instead of active ones. Defaults to false.')
    })
    .describe('Filters and pagination options for listing vendor credits.');

const OutputSchema = z
    .object({
        items: z.array(VendorCreditSchema).describe('Vendor credits returned on this page.'),
        next_cursor: z.string().optional().describe('Cursor for the next page; pass it back as `cursor`. Omitted when there are no more pages.')
    })
    .describe('A page of vendor credits with an optional cursor for the next page.');

const ProviderResponseSchema = z.object({
    data: z.array(VendorCreditSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

function resolveNextCursor(pageNextUrl: string | null, items: z.infer<typeof VendorCreditSchema>[]): string | undefined {
    if (pageNextUrl === null) {
        return undefined;
    }
    const parsedUrl = z.url().safeParse(pageNextUrl);
    if (parsedUrl.success) {
        const start = new URL(parsedUrl.data).searchParams.get('start');
        if (start !== null && start !== '') {
            return start;
        }
    }
    return items.at(-1)?.id;
}

/**
 * @tags: [read]
 * @tagReason: Read-only: lists vendor credits from the provider without modifying any provider state.
 * @pitfalls: Results are filtered by default to active, non-fully-used credits; pass include_fully_used and/or is_archived to widen them, and archived credits cannot be applied to bills. created_at filters require full ISO 8601 datetimes while accounting-date filters require plain dates (YYYY-MM-DD). Amounts are minor-unit integers paired with a currency code, and only USD is supported.
 */
const action = createAction({
    description: 'List credits issued by vendors (e.g. refunds/overpayments) applicable against future bills.',
    version: '1.0.0',
    scopes: ['vendors:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get<unknown>({
            // https://docs.ramp.com/openapi/developer-api.json - GET /developer/v1/vendors/credits
            endpoint: '/developer/v1/vendors/credits',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.entity_id !== undefined && { entity_id: input.entity_id }),
                ...(input.from_created_at !== undefined && { from_created_at: input.from_created_at }),
                ...(input.to_created_at !== undefined && { to_created_at: input.to_created_at }),
                ...(input.from_accounting_date !== undefined && { from_accounting_date: input.from_accounting_date }),
                ...(input.to_accounting_date !== undefined && { to_accounting_date: input.to_accounting_date }),
                ...(input.include_fully_used !== undefined && { include_fully_used: String(input.include_fully_used) }),
                ...(input.is_archived !== undefined && { is_archived: String(input.is_archived) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const nextCursor = resolveNextCursor(parsed.page.next, parsed.data);

        return {
            items: parsed.data,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
