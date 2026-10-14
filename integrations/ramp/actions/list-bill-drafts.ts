import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z
    .object({
        amount: z.number().int().describe('Amount in the smallest denomination of the currency (e.g. cents for USD).'),
        currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"'),
        minor_unit_conversion_rate: z
            .number()
            .int()
            .nullable()
            .optional()
            .describe('Divisor used to convert `amount` to the major currency value (e.g. 100 for USD).')
    })
    .describe('A monetary amount expressed in the smallest denomination of its currency.');

const AccountingFieldSchema = z
    .object({
        id: z.string().describe('Ramp ID that uniquely identifies the accounting field.'),
        external_id: z.string().describe('External (ERP) ID that identifies the accounting field.'),
        name: z.string().describe('Name of the accounting field.'),
        type: z.string().describe('Accounting field type. Example: "GL_ACCOUNT"')
    })
    .describe('Definition of an accounting field (category).');

const AccountingFieldSelectionSchema = z
    .object({
        id: z.string().describe('Ramp ID of the selected accounting field option.'),
        external_id: z.string().describe('External (ERP) ID of the selected accounting field option.'),
        name: z.string().describe('Name of the selected accounting field option.'),
        display_name: z.string().nullable().optional().describe('Ramp-side display name override for the option, if any.'),
        external_code: z.string().nullable().optional().describe('Code of the option as displayed in the ERP, if any.'),
        provider_name: z.string().nullable().optional().describe('Name of the accounting provider that owns the option, if any.'),
        category_info: AccountingFieldSchema.describe('Information about the accounting category the option belongs to.')
    })
    .describe('An accounting field option selected to code a bill or line item.');

const BillOwnerSchema = z
    .object({
        id: z.string().describe('Ramp user ID of the bill owner.'),
        first_name: z.string().nullable().optional().describe("Bill owner's first name."),
        last_name: z.string().nullable().optional().describe("Bill owner's last name.")
    })
    .describe('Information about the owner of a bill.');

const BillVendorSchema = z
    .object({
        id: z.string().describe('Unique identifier of the vendor.'),
        name: z.string().describe('Name of the vendor.'),
        remote_id: z.string().nullable().optional().describe('External ID that uniquely identifies the vendor on the client side.'),
        remote_name: z.string().nullable().optional().describe('Name of the vendor in the remote system.'),
        remote_code: z.string().nullable().optional().describe('Code of the vendor in the remote ERP system.'),
        type: z.string().nullable().optional().describe('Vendor type. Example: "BUSINESS"')
    })
    .describe('Vendor associated with a bill.');

const DraftBillLineItemSchema = z
    .object({
        id: z.string().describe('Unique identifier of the line item.'),
        amount: CurrencyAmountSchema.nullable().optional().describe('Amount of the line item.'),
        memo: z.string().nullable().optional().describe('Memo of the line item.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field options selected to code the line item.')
    })
    .describe('A line item on a draft bill.');

const DraftBillInventoryLineItemSchema = z
    .object({
        id: z.string().describe('Unique identifier of the inventory line item.'),
        amount: CurrencyAmountSchema.nullable().optional().describe('Amount of the inventory line item.'),
        unit_price: CurrencyAmountSchema.nullable().optional().describe('Unit price of the inventory line item.'),
        quantity: z.number().nullable().optional().describe('Quantity of the inventory line item.'),
        memo: z.string().nullable().optional().describe('Memo of the inventory line item.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field options selected to code the inventory line item.')
    })
    .describe('An inventory line item on a draft bill.');

const DraftBillSchema = z
    .object({
        id: z.string().describe('Unique identifier of the draft bill.'),
        created_at: z.string().describe('When the draft bill was created, as an ISO 8601 datetime.'),
        status: z.string().describe('Payment status of the draft bill. Always "DRAFT" for provisional bills.'),
        sync_status: z.string().describe('Sync status of the draft bill. Always "NOT_SYNCED" for drafts.'),
        accounting_date: z.string().nullable().optional().describe('Date used for accounting purposes, as an ISO 8601 datetime.'),
        issued_at: z.string().nullable().optional().describe('Date the bill was issued on the invoice, as an ISO 8601 datetime.'),
        due_at: z.string().nullable().optional().describe('Date the bill is due, as an ISO 8601 datetime.'),
        posting_date: z.string().nullable().optional().describe('Date the bill was posted to the ERP, as an ISO 8601 datetime.'),
        amount: CurrencyAmountSchema.nullable().optional().describe('Total amount of the bill.'),
        entity_id: z.string().nullable().optional().describe('ID of the business entity associated with the bill.'),
        invoice_number: z.string().nullable().optional().describe('Invoice number on the bill.'),
        remote_id: z.string().nullable().optional().describe('External ID that identifies the bill on the client side.'),
        memo: z.string().nullable().optional().describe('Memo of the bill.'),
        vendor_memo: z.string().nullable().optional().describe('Memo to the vendor.'),
        invoice_urls: z.array(z.string()).describe('Pre-signed URLs to download the invoice files attached to the bill.'),
        bill_owner: BillOwnerSchema.nullable().optional().describe('Information about the bill owner.'),
        vendor: BillVendorSchema.nullable().optional().describe('Vendor information of the bill.'),
        line_items: z.array(DraftBillLineItemSchema).describe('Line items related to the bill.'),
        inventory_line_items: z.array(DraftBillInventoryLineItemSchema).describe('Inventory line items related to the bill.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field options selected to code the bill.')
    })
    .describe('A draft bill that has not yet been submitted into the approval and payment flow.');

const DraftBillsResponseSchema = z.object({
    data: z.array(DraftBillSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

const InputSchema = z
    .object({
        cursor: z.string().optional().describe("Pagination cursor from a previous response's `next_cursor`. Omit to fetch the first page."),
        entity_id: z.string().optional().describe('Only return draft bills for this business entity ID.'),
        invoice_number: z.string().optional().describe('Only return draft bills with this exact invoice number.'),
        remote_id: z.string().optional().describe('Only return draft bills with this exact remote ID.'),
        vendor_id: z.string().optional().describe('Only return draft bills for this vendor ID.'),
        from_created_at: z.string().optional().describe('Only return draft bills created on or after this ISO 8601 datetime.'),
        to_created_at: z.string().optional().describe('Only return draft bills created on or before this ISO 8601 datetime.'),
        from_due_date: z.string().optional().describe('Only return draft bills due on or after this ISO 8601 datetime.'),
        to_due_date: z.string().optional().describe('Only return draft bills due on or before this ISO 8601 datetime.'),
        from_issued_date: z.string().optional().describe('Only return draft bills issued on or after this ISO 8601 datetime.'),
        to_issued_date: z.string().optional().describe('Only return draft bills issued on or before this ISO 8601 datetime.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of results to return per page, between 2 and 100. Defaults to 20.')
    })
    .describe('Filters and pagination options for listing draft bills.');

const OutputSchema = z
    .object({
        draft_bills: z.array(DraftBillSchema).describe('Draft bills returned for this page.'),
        next_cursor: z.string().optional().describe('Cursor to pass as `cursor` to fetch the next page. Absent when there are no more pages.')
    })
    .describe('A single page of draft bills along with the cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Lists draft bills from the provider without creating, updating, or deleting any provider state.
 * @pitfalls: The created/due/issued date filters require full ISO 8601 datetimes (a plain date is rejected), and a bill leaves this list once it is submitted.
 */
const action = createAction({
    description: 'List bills that are still in draft state (not yet submitted into the approval/payment flow).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bills:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json (operation get_draft_bill_list_with_pagination)
            endpoint: '/developer/v1/bills/drafts',
            params: {
                ...(input.cursor && { start: input.cursor }),
                ...(input.entity_id && { entity_id: input.entity_id }),
                ...(input.invoice_number && { invoice_number: input.invoice_number }),
                ...(input.remote_id && { remote_id: input.remote_id }),
                ...(input.vendor_id && { vendor_id: input.vendor_id }),
                ...(input.from_created_at && { from_created_at: input.from_created_at }),
                ...(input.to_created_at && { to_created_at: input.to_created_at }),
                ...(input.from_due_date && { from_due_date: input.from_due_date }),
                ...(input.to_due_date && { to_due_date: input.to_due_date }),
                ...(input.from_issued_date && { from_issued_date: input.from_issued_date }),
                ...(input.to_issued_date && { to_issued_date: input.to_issued_date }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        });

        const parsed = DraftBillsResponseSchema.parse(response.data);

        let next_cursor: string | undefined;
        if (parsed.page.next) {
            const start = new URL(parsed.page.next).searchParams.get('start');
            if (start) {
                next_cursor = start;
            }
        }

        return {
            draft_bills: parsed.data,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
