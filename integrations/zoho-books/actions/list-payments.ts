import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    filter_by: z
        .string()
        .optional()
        .describe(
            'Filter payments by mode. Allowed values: PaymentMode.All, PaymentMode.Check, PaymentMode.Cash, PaymentMode.BankTransfer, PaymentMode.CreditCard, PaymentMode.Stripe, etc.'
        ),
    payment_mode: z.string().optional().describe('Filter payments by payment mode.'),
    sort_column: z.string().optional().describe('Sort column for the results.'),
    search_text: z.string().optional().describe('Search payments by text. Max length 100.'),
    per_page: z.number().optional().describe('Number of records per page. Max 200.')
});

const TagSchema = z.object({
    tag_id: z.string().optional(),
    tag_name: z.string().optional(),
    tag_option_id: z.string().optional(),
    tag_option_name: z.string().optional(),
    is_tag_mandatory: z.boolean().optional()
});

const AppliedInvoiceSchema = z.object({
    invoice_id: z.string().optional(),
    invoice_number: z.string().optional(),
    date: z.string().optional(),
    invoice_amount: z.number().optional(),
    amount_applied: z.number().optional(),
    balance_amount: z.number().optional()
});

const ProviderPaymentSchema = z.object({
    payment_id: z.string().describe('Payment ID. Example: "260815000000114002"'),
    payment_number: z.string().optional(),
    invoice_numbers: z.string().optional(),
    date: z.string().optional(),
    payment_mode: z.string().optional(),
    payment_mode_formatted: z.string().optional(),
    amount: z.number().optional(),
    bcy_amount: z.number().optional(),
    unused_amount: z.number().optional(),
    bcy_unused_amount: z.number().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    description: z.string().optional(),
    reference_number: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional(),
    last_four_digits: z.string().optional(),
    gateway_transaction_id: z.string().optional(),
    payment_gateway: z.string().optional(),
    bcy_refunded_amount: z.number().optional(),
    applied_invoices: z.array(AppliedInvoiceSchema).optional(),
    has_attachment: z.boolean().optional(),
    tags: z.array(TagSchema).optional(),
    tax_account_id: z.string().optional(),
    tax_account_name: z.string().optional(),
    tax_amount_withheld: z.number().optional(),
    payment_type: z.string().optional(),
    payment_status: z.string().optional(),
    settlement_status: z.string().optional(),
    sales_channel: z.string().optional()
});

const PageContextSchema = z.object({
    page: z.number().optional(),
    per_page: z.number().optional(),
    has_more_page: z.boolean().optional(),
    report_name: z.string().optional(),
    applied_filter: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    customerpayments: z.array(ProviderPaymentSchema).optional(),
    page_context: PageContextSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderPaymentSchema),
    next_page: z.string().optional()
});

const action = createAction({
    description: 'List customer payments from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-payments',
        group: 'Customer Payments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.customerpayments.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            const firstOrg = orgData.organizations?.[0];
            if (orgData.code !== 0 || !firstOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = firstOrg.organization_id;
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid positive integer page number.'
            });
        }

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/customerpayments/
            endpoint: '/books/v3/customerpayments',
            params: {
                organization_id: organizationId,
                page: String(page),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.filter_by !== undefined && { filter_by: input.filter_by }),
                ...(input.payment_mode !== undefined && { payment_mode: input.payment_mode }),
                ...(input.sort_column !== undefined && { sort_column: input.sort_column }),
                ...(input.search_text !== undefined && { search_text: input.search_text })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        const items = providerResponse.customerpayments || [];
        const pageContext = providerResponse.page_context;
        const hasMorePage = pageContext?.has_more_page ?? false;
        const nextPage = hasMorePage ? String(page + 1) : undefined;

        return {
            items,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
