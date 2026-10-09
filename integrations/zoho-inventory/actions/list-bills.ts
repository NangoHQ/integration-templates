import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const BillSchema = z
    .object({
        bill_id: z.string().describe('Unique identifier of the bill.'),
        bill_number: z.string().optional().describe('Bill number assigned to the vendor bill.'),
        vendor_id: z.string().optional().describe('Unique identifier of the vendor the bill is owed to.'),
        vendor_name: z.string().optional().describe('Display name of the vendor.'),
        status: z.string().optional().describe('Current status of the bill, such as draft, open, overdue, paid or void.'),
        current_sub_status: z.string().optional().describe('Workflow sub-status of the bill, empty when none applies.'),
        reference_number: z.string().optional().describe('Vendor reference number for the bill.'),
        date: z.string().optional().describe('Bill date in YYYY-MM-DD format.'),
        due_date: z.string().optional().describe('Payment due date in YYYY-MM-DD format.'),
        due_days: z.string().optional().describe('Human-readable due description, for example "Overdue by 10 days".'),
        currency_id: z.string().optional().describe('Unique identifier of the bill currency.'),
        currency_code: z.string().optional().describe('ISO currency code, for example "USD".'),
        exchange_rate: z.number().optional().describe('Exchange rate applied to the bill currency.'),
        price_precision: z.number().optional().describe('Number of decimal places used for bill prices.'),
        total: z.number().optional().describe('Total amount of the bill.'),
        balance: z.number().optional().describe('Outstanding balance still due on the bill.'),
        balance_due: z.number().optional().describe('Amount still due on the bill.'),
        tds_total: z.number().optional().describe('Total tax deducted at source on the bill.'),
        unprocessed_payment_amount: z.number().optional().describe('Payment amount not yet applied to the bill.'),
        created_time: z.string().optional().describe('Time the bill was created, in ISO 8601 format with a numeric UTC offset.'),
        last_modified_time: z.string().optional().describe('Time the bill was last modified, in ISO 8601 format with a numeric UTC offset.'),
        created_by: z.string().optional().describe('Name of the user who created the bill.'),
        last_modified_by: z.string().optional().describe('Name of the user who last modified the bill.'),
        has_attachment: z.boolean().optional().describe('Whether the bill has an attachment.'),
        attachment_name: z.string().optional().describe('Name of the bill attachment, empty when there is none.'),
        entity_type: z.string().optional().describe('Entity type of the record, typically "bill".'),
        is_viewed_by_client: z.boolean().optional().describe('Whether the vendor has viewed the bill.'),
        client_viewed_time: z.string().optional().describe('Time the vendor viewed the bill, empty when not viewed.'),
        is_opening_balance: z.string().optional().describe('Identifier set when the bill is an opening-balance record.'),
        is_uber_bill: z.boolean().optional().describe('Whether the bill is an Uber expense bill.'),
        is_tally_bill: z.boolean().optional().describe('Whether the bill was imported from Tally.'),
        is_bill_reconciliation_violated: z.boolean().optional().describe('Whether the bill violates bill reconciliation rules.'),
        tags: z.array(z.unknown()).optional().describe('Tags associated with the bill.'),
        documents: z.string().optional().describe('Documents attached to the bill.')
    })
    .passthrough();

const PageContextSchema = z
    .object({
        page: z.number().describe('Current page number.'),
        per_page: z.number().describe('Number of bills requested per page.'),
        has_more_page: z.boolean().describe('Whether more bills are available on a subsequent page.'),
        report_name: z.string().optional().describe('Name of the underlying report, typically "Bills".'),
        applied_filter: z.string().optional().describe('Filter applied to the report, typically "Status.All".'),
        sort_column: z.string().optional().describe('Column the bills are sorted by.'),
        sort_order: z.string().optional().describe('Sort direction, "A" for ascending or "D" for descending.'),
        custom_fields: z.array(z.unknown()).optional().describe('Custom fields included in the report.')
    })
    .passthrough();

const ProviderEnvelopeSchema = z.object({
    code: z.number(),
    message: z.string()
});

const ProviderResponseSchema = ProviderEnvelopeSchema.extend({
    bills: z.array(BillSchema),
    page_context: PageContextSchema
});

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            ),
        page: z.number().int().positive().optional().describe('Page number to fetch, starting at 1. Defaults to 1.'),
        per_page: z.number().int().min(1).max(200).optional().describe('Number of bills to return per page, up to 200. Defaults to 200.')
    })
    .describe('Input for listing vendor bills in a Zoho Inventory organization.');

const OutputSchema = z
    .object({
        bills: z.array(BillSchema).describe('Vendor bills returned on the requested page.'),
        page_context: PageContextSchema.describe('Pagination metadata for the returned page of bills.')
    })
    .describe('A page of vendor bills together with pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Lists vendor bills from the organization via a read-only GET request; it performs no provider mutations.
 * @pitfalls: The list returns a reduced bill summary (no line items, payments, addresses or taxes) and only one page at a time; fetch a bill by ID for full details and keep paging while page_context.has_more_page is true.
 */
const action = createAction({
    description: 'List vendor bills in the organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.bills.READ', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const response = await nango.get({
            // https://www.zoho.com/inventory/api/v1/bills/#list-all-bills
            endpoint: '/inventory/v1/bills',
            params: {
                organization_id: organizationId,
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        const envelope = ProviderEnvelopeSchema.safeParse(response.data);
        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when listing bills.',
                details: envelope.error.message
            });
        }

        if (envelope.data.code !== 0) {
            throw new nango.ActionError({ type: 'provider_error', message: envelope.data.message, code: envelope.data.code });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected bills payload from Zoho Inventory API.',
                details: parsed.error.message
            });
        }

        return {
            bills: parsed.data.bills,
            page_context: parsed.data.page_context
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
