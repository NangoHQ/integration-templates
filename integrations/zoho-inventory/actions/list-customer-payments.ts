import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            ),
        filter_by: z
            .string()
            .optional()
            .describe(
                'Filter payments by mode. Allowed values: PaymentMode.All, PaymentMode.Check, PaymentMode.Cash, PaymentMode.BankTransfer, PaymentMode.CreditCard, PaymentMode.Stripe, etc.'
            ),
        payment_mode: z.string().optional().describe('Search payments by payment mode. Supports the _startswith and _contains variants.'),
        sort_column: z.string().optional().describe('Sort the results by the given column. Example: "date".'),
        search_text: z.string().optional().describe('Search payments by reference number, customer name, or payment description. Maximum length 100.'),
        per_page: z.number().int().min(1).max(200).optional().describe('Number of records per page, between 1 and 200. Defaults to 200.')
    })
    .describe('Input for listing customer payments from Zoho Inventory.');

const AppliedInvoiceSchema = z.object({
    invoice_id: z.string().optional().nullable().describe('ID of the invoice the payment was applied to.'),
    invoice_number: z.string().optional().nullable().describe('Display number of the invoice. Example: "INV-000384".'),
    date: z.string().optional().nullable().describe('Invoice date in yyyy-mm-dd format.'),
    invoice_amount: z.number().optional().nullable().describe('Total amount of the invoice.'),
    amount_applied: z.number().optional().nullable().describe('Amount of this payment applied to the invoice.'),
    balance_amount: z.number().optional().nullable().describe('Remaining unpaid balance on the invoice after this payment.')
});

const ProviderPaymentSchema = z.object({
    payment_id: z.string().describe('Unique ID of the customer payment. Example: "260815000000114002".'),
    payment_number: z.string().optional().nullable().describe('Sequential payment number within the organization.'),
    invoice_numbers: z.string().optional().nullable().describe('Comma-separated list of invoice numbers this payment is applied to.'),
    date: z.string().optional().nullable().describe('Date the payment was made, in yyyy-mm-dd format.'),
    payment_mode: z.string().optional().nullable().describe('Mode of payment, such as cash, check, creditcard, or banktransfer.'),
    payment_mode_formatted: z.string().optional().nullable().describe('Human-readable label for the payment mode.'),
    amount: z.number().optional().nullable().describe('Amount paid in the organization currency.'),
    bcy_amount: z.number().optional().nullable().describe('Amount paid in the base currency of the organization.'),
    unused_amount: z.number().optional().nullable().describe('Portion of the payment not applied to any invoice.'),
    bcy_unused_amount: z.number().optional().nullable().describe('Unused amount expressed in the base currency.'),
    account_id: z.string().optional().nullable().describe('ID of the bank or cash account the payment was deposited into.'),
    account_name: z.string().optional().nullable().describe('Name of the account the payment was deposited into.'),
    description: z.string().optional().nullable().describe('Free-text description attached to the payment.'),
    reference_number: z.string().optional().nullable().describe('Reference number recorded for the payment.'),
    is_paid_via_check: z.boolean().optional().nullable().describe('Whether the payment was made by check.'),
    customer_id: z.string().optional().nullable().describe('ID of the customer who made the payment.'),
    customer_name: z.string().optional().nullable().describe('Name of the customer who made the payment.'),
    created_time: z.string().optional().nullable().describe('Creation timestamp with the organization timezone offset.'),
    last_modified_time: z.string().optional().nullable().describe('Last modification timestamp with the organization timezone offset.'),
    bcy_refunded_amount: z.number().optional().nullable().describe('Amount refunded, expressed in the base currency.'),
    applied_invoices: z.array(AppliedInvoiceSchema).optional().describe('Invoices this payment is applied to, with the amount applied to each.'),
    has_attachment: z.boolean().optional().nullable().describe('Whether the payment has an attached document.'),
    tax_account_id: z.string().optional().nullable().describe('ID of the tax account associated with the payment.'),
    tax_account_name: z.string().optional().nullable().describe('Name of the tax account associated with the payment.'),
    tax_amount_withheld: z.number().optional().nullable().describe('Tax amount withheld from the payment.'),
    payment_type: z.string().optional().nullable().describe('Type of payment, such as "Invoice Payment".'),
    payment_status: z.string().optional().nullable().describe('Payment status reported by Zoho, such as paid.'),
    settlement_status: z.string().optional().nullable().describe('Settlement status of the payment, if tracked.'),
    sales_channel: z.string().optional().nullable().describe('Sales channel the payment originated from.')
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

const OutputSchema = z
    .object({
        items: z.array(ProviderPaymentSchema).describe('Customer payments for the requested page.'),
        next_page: z.string().optional().describe('Page cursor to fetch the next page. Absent when there are no more pages.')
    })
    .describe('A page of customer payments from Zoho Inventory.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of customer payments from the provider without mutating any data.
 * @pitfalls: Multiple organizations require an explicit organization_id or the action fails rather than picking one; applied_invoices can be empty even for payments already applied to invoices, so per-invoice allocation may require fetching the payment individually.
 */
const action = createAction({
    description: 'List customer payments from Zoho Inventory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.customerpayments.READ', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const page = input.cursor ? Number(input.cursor) : 1;
        if (!Number.isInteger(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid positive integer page number.'
            });
        }

        const response = await nango.get({
            // https://www.zoho.com/inventory/api/v1/customer-payments/#list-customer-payments
            endpoint: '/inventory/v1/customerpayments',
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
