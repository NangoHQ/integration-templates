import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Zoho Books organization ID. Example: "927270289"'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().optional().describe('Number of bills to retrieve per page.'),
    vendor_id: z.string().optional().describe('Filter bills by vendor ID.'),
    status: z.string().optional().describe('Filter bills by status: paid, open, overdue, void, partially_paid.'),
    bill_number: z.string().optional().describe('Filter bills by bill number.')
});

const ProviderBillSchema = z.object({
    bill_id: z.string(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    status: z.string().optional(),
    bill_number: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    due_days: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    price_precision: z.number().optional(),
    exchange_rate: z.number().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    attachment_name: z.string().optional(),
    has_attachment: z.boolean().optional(),
    is_tds_applied: z.boolean().optional(),
    is_abn_quoted: z.string().optional()
});

const ProviderPageContextSchema = z.object({
    page: z.number().optional(),
    per_page: z.number().optional(),
    has_more_page: z.boolean().optional(),
    report_name: z.string().optional(),
    applied_filter: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    bills: z.array(ProviderBillSchema).optional(),
    page_context: ProviderPageContextSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderBillSchema),
    next_page: z.string().optional()
});

const action = createAction({
    description: 'List bills from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-bills'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.bills.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer representing a page number'
            });
        }

        const params: Record<string, string | number> = {
            organization_id: input.organization_id,
            page: page
        };

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.vendor_id !== undefined) {
            params['vendor_id'] = input.vendor_id;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.bill_number !== undefined) {
            params['bill_number'] = input.bill_number;
        }

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/bills/#list-bills
            endpoint: '/books/v3/bills',
            params: params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const bills = providerResponse.bills ?? [];
        const hasMorePage = providerResponse.page_context?.has_more_page ?? false;
        const nextPage = hasMorePage ? String(page + 1) : undefined;

        return {
            items: bills,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
