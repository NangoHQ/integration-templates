import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InvoiceStatusSchema = z.enum(['sent', 'draft', 'overdue', 'paid', 'void', 'unpaid', 'partially_paid', 'viewed']);

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .optional()
            .describe('Zoho Inventory organization ID. If omitted and exactly one organization exists, it is discovered automatically.'),
        page: z.number().int().positive().optional().describe('Page number to fetch, starting at 1. Default: 1.'),
        per_page: z.number().int().min(1).max(200).optional().describe('Number of invoices per page, between 1 and 200. Default: 200.'),
        invoice_id: z
            .string()
            .optional()
            .describe('Invoice ID to filter by. Zoho Inventory ignores this filter, so use invoice_number to target a specific invoice.'),
        invoice_number: z.string().optional().describe('Filter by the unique invoice number. Example: "INV-000041".'),
        reference_number: z.string().optional().describe('Filter by the reference number recorded on the invoice.'),
        customer_id: z.string().optional().describe('Filter by the ID of the customer the invoice is billed to. Example: "260815000000097001".'),
        status: InvoiceStatusSchema.optional().describe('Filter by invoice status.'),
        date: z.string().optional().describe('Filter by invoice date in yyyy-mm-dd format.'),
        due_date: z.string().optional().describe('Filter by invoice due date in yyyy-mm-dd format.')
    })
    .describe('Filters and pagination options for listing Zoho Inventory invoices.');

const InvoiceSchema = z.object({
    invoice_id: z.string().optional().describe('Unique identifier of the invoice. Example: "260815000000160134".'),
    invoice_number: z.string().optional().describe('Invoice number. Example: "INV-000041".'),
    status: z.string().optional().describe('Invoice status: draft, sent, viewed, unpaid, partially_paid, paid, overdue or void.'),
    customer_id: z.string().optional().describe('Unique identifier of the customer the invoice is billed to.'),
    customer_name: z.string().optional().describe('Name of the customer the invoice is billed to.'),
    reference_number: z.string().nullable().optional().describe('Reference number recorded on the invoice.'),
    date: z.string().optional().describe('Invoice date in yyyy-mm-dd format.'),
    due_date: z.string().nullable().optional().describe('Payment due date in yyyy-mm-dd format.'),
    total: z.number().optional().describe('Total amount of the invoice.'),
    balance: z.number().optional().describe('Outstanding unpaid amount of the invoice.'),
    currency_id: z.string().nullable().optional().describe('Unique identifier of the invoice currency.'),
    currency_code: z.string().nullable().optional().describe('Currency code of the invoice. Example: "USD".'),
    exchange_rate: z.number().nullable().optional().describe('Exchange rate applied to the invoice currency.'),
    is_viewed_by_client: z.boolean().nullable().optional().describe('Whether the customer has viewed the invoice.'),
    is_emailed: z.boolean().nullable().optional().describe('Whether the invoice has been emailed to the customer.'),
    has_attachment: z.boolean().nullable().optional().describe('Whether the invoice has any attachments.'),
    created_time: z.string().nullable().optional().describe('Timestamp when the invoice was created.'),
    last_modified_time: z.string().nullable().optional().describe('Timestamp when the invoice was last modified.'),
    last_payment_date: z.string().nullable().optional().describe('Date of the most recent payment received for the invoice.'),
    salesperson_id: z.string().nullable().optional().describe('Unique identifier of the salesperson assigned to the invoice.'),
    salesperson_name: z.string().nullable().optional().describe('Name of the salesperson assigned to the invoice.'),
    shipping_charge: z.number().nullable().optional().describe('Shipping charge applied to the invoice.'),
    adjustment: z.number().nullable().optional().describe('Adjustment amount applied to the invoice.'),
    write_off_amount: z.number().nullable().optional().describe('Amount written off for the invoice.')
});

const PageContextSchema = z.object({
    page: z.number().int().optional(),
    per_page: z.number().int().optional(),
    has_more_page: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().int(),
    message: z.string().optional(),
    invoices: z.array(InvoiceSchema).optional(),
    page_context: PageContextSchema.optional()
});

const OutputSchema = z
    .object({
        invoices: z.array(InvoiceSchema).describe('Invoices matching the filters on the requested page.'),
        page: z.number().int().describe('Page number of the returned results.'),
        per_page: z.number().int().describe('Number of invoices returned per page.'),
        has_more_page: z.boolean().describe('Whether another page of invoices is available.'),
        next_page: z.number().int().optional().describe('Page number to request next; present only when more invoices exist.')
    })
    .describe('A page of Zoho Inventory invoices together with pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Lists invoices from Zoho Inventory with optional filters and never modifies provider state.
 * @pitfalls: The invoice_id filter is silently ignored and returns the unfiltered page (use invoice_number to target one invoice), and requesting a page beyond the last returns an empty invoices array with has_more_page false rather than an error.
 */
const action = createAction({
    description: 'List invoices in a Zoho Inventory organization, with optional status and customer filtering.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.invoices.READ', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
            const orgResponse = await nango.get<unknown>({
                endpoint: '/inventory/v1/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Inventory.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Inventory account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Inventory account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const page = input.page ?? 1;
        if (!Number.isInteger(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_page',
                message: 'page must be a positive integer'
            });
        }

        const params: Record<string, string | number> = {
            organization_id: organizationId,
            page
        };

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.invoice_id !== undefined) {
            params['invoice_id'] = input.invoice_id;
        }
        if (input.invoice_number !== undefined) {
            params['invoice_number'] = input.invoice_number;
        }
        if (input.reference_number !== undefined) {
            params['reference_number'] = input.reference_number;
        }
        if (input.customer_id !== undefined) {
            params['customer_id'] = input.customer_id;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.date !== undefined) {
            params['date'] = input.date;
        }
        if (input.due_date !== undefined) {
            params['due_date'] = input.due_date;
        }

        // https://www.zoho.com/inventory/api/v1/invoices/#list-invoices
        const response = await nango.get<unknown>({
            endpoint: '/inventory/v1/invoices',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message ?? 'Unknown error from Zoho Inventory',
                code: providerResponse.code
            });
        }

        const invoices = providerResponse.invoices ?? [];
        const pageContext = providerResponse.page_context;
        const returnedPage = pageContext?.page ?? page;
        const returnedPerPage = pageContext?.per_page ?? input.per_page ?? 200;
        const hasMorePage = pageContext?.has_more_page ?? false;

        return {
            invoices,
            page: returnedPage,
            per_page: returnedPerPage,
            has_more_page: hasMorePage,
            ...(hasMorePage && { next_page: returnedPage + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
