import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization ID. Example: "927270289"'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().int().min(1).max(200).optional().describe('Number of records per page. Default: 200'),
    vendor_id: z.string().optional().describe('Filter by vendor ID'),
    bill_id: z.string().optional().describe('Filter by Bill ID'),
    reference_number: z.string().optional().describe('Search by reference number'),
    payment_number: z.string().optional().describe('Search by payment number'),
    date: z.string().optional().describe('Payment date'),
    amount: z.number().optional().describe('Payment amount'),
    payment_mode: z.string().optional().describe('Search by payment mode'),
    vendor_name: z.string().optional().describe('Search by vendor name'),
    search_text: z.string().optional().describe('Search by reference number, vendor name, or payment description'),
    filter_by: z
        .string()
        .optional()
        .describe(
            'Filter by payment mode. Allowed values: PaymentMode.All, PaymentMode.Check, PaymentMode.Cash, PaymentMode.BankTransfer, PaymentMode.Paypal, PaymentMode.CreditCard, PaymentMode.GoogleCheckout, PaymentMode.Credit, PaymentMode.Authorizenet, PaymentMode.BankRemittance, PaymentMode.Payflowpro, PaymentMode.Others'
        ),
    sort_column: z.string().optional().describe('Sort list. Allowed values: vendor_name, date, reference_number, amount, balance')
});

const TagSchema = z.object({
    tag_id: z.string().optional(),
    tag_name: z.string().optional(),
    tag_option_id: z.string().optional(),
    tag_option_name: z.string().optional(),
    is_tag_mandatory: z.boolean().optional()
});

const VendorPaymentSchema = z.object({
    payment_id: z.string(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    bill_numbers: z.string().optional(),
    payment_mode: z.string().optional(),
    payment_number: z.union([z.string(), z.number()]).optional(),
    description: z.string().optional(),
    date: z.string().optional(),
    reference_number: z.string().optional(),
    exchange_rate: z.number().optional(),
    amount: z.number().optional(),
    bcy_amount: z.number().optional(),
    paid_through_account_id: z.string().optional(),
    paid_through_account_name: z.string().optional(),
    balance: z.number().optional(),
    bcy_balance: z.number().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    is_paid_via_print_check: z.boolean().optional(),
    has_attachment: z.boolean().optional(),
    is_ach_payment: z.boolean().optional(),
    ach_payment_status: z.string().optional(),
    ach_gw_transaction_id: z.string().optional(),
    tags: z.array(TagSchema).optional(),
    check_details: z.object({}).passthrough().optional()
});

const OutputSchema = z.object({
    items: z.array(VendorPaymentSchema),
    next_cursor: z.string().optional()
});

const PageContextSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    has_more_page: z.boolean()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    vendorpayments: z.array(VendorPaymentSchema).optional(),
    page_context: PageContextSchema.optional()
});

const action = createAction({
    description: 'List vendor payments from Zoho Books',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-vendor-payments',
        group: 'Vendor Payments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.vendorpayments.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid page number'
            });
        }

        const params: Record<string, string | number> = {
            organization_id: input.organization_id,
            page: page,
            per_page: input.per_page ?? 200
        };

        if (input.vendor_id !== undefined) {
            params['vendor_id'] = input.vendor_id;
        }
        if (input.bill_id !== undefined) {
            params['bill_id'] = input.bill_id;
        }
        if (input.reference_number !== undefined) {
            params['reference_number'] = input.reference_number;
        }
        if (input.payment_number !== undefined) {
            params['payment_number'] = input.payment_number;
        }
        if (input.date !== undefined) {
            params['date'] = input.date;
        }
        if (input.amount !== undefined) {
            params['amount'] = input.amount;
        }
        if (input.payment_mode !== undefined) {
            params['payment_mode'] = input.payment_mode;
        }
        if (input.vendor_name !== undefined) {
            params['vendor_name'] = input.vendor_name;
        }
        if (input.search_text !== undefined) {
            params['search_text'] = input.search_text;
        }
        if (input.filter_by !== undefined) {
            params['filter_by'] = input.filter_by;
        }
        if (input.sort_column !== undefined) {
            params['sort_column'] = input.sort_column;
        }

        // https://www.zoho.com/books/api/v3/vendor-payments/#list-vendor-payments
        const response = await nango.get({
            endpoint: '/books/v3/vendorpayments',
            params: params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const vendorPayments = providerResponse.vendorpayments ?? [];
        const hasMorePage = providerResponse.page_context?.has_more_page ?? false;
        const nextCursor = hasMorePage ? String(page + 1) : undefined;

        return {
            items: vendorPayments,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
