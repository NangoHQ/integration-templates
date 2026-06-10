import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    customer_id: z.string().describe('Customer ID. Example: "260815000000097001"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    line_items: z
        .array(
            z.object({
                item_id: z.string().describe('Item ID. Example: "260815000000100002"'),
                quantity: z.number().describe('Quantity of the item. Example: 1'),
                rate: z.number().optional().describe('Rate of the item. Example: 100'),
                description: z.string().optional().describe('Description of the line item.'),
                tax_id: z.string().optional().describe('Tax ID to apply.')
            })
        )
        .describe('Line items for the invoice.'),
    invoice_number: z.string().optional().describe('Invoice number. Example: "INV-00001"'),
    date: z.string().optional().describe('Invoice date. Format: yyyy-mm-dd. Example: "2026-06-09"'),
    due_date: z.string().optional().describe('Due date. Format: yyyy-mm-dd. Example: "2026-06-16"'),
    notes: z.string().optional().describe('Notes for the invoice.'),
    terms: z.string().optional().describe('Terms and conditions.'),
    reference_number: z.string().optional().describe('Reference number.')
});

const ZohoIdSchema = z.union([z.string(), z.number()]).transform((value) => String(value));

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    invoice: z.object({
        invoice_id: ZohoIdSchema,
        invoice_number: z.string(),
        customer_id: ZohoIdSchema,
        status: z.string(),
        total: z.number().optional(),
        balance: z.number().optional()
    })
});

const OutputSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string(),
    customer_id: z.string(),
    status: z.string(),
    total: z.number().optional(),
    balance: z.number().optional()
});

const action = createAction({
    description: 'Create an invoice in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-invoice'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.invoices.CREATE', 'ZohoBooks.settings.READ'],
    exec: async (nango, input) => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0 || !orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
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
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const response = await nango.post({
            // https://www.zoho.com/books/api/v3/invoices/#create-an-invoice
            endpoint: '/books/v3/invoices',
            params: {
                organization_id: organizationId
            },
            data: {
                customer_id: input.customer_id,
                line_items: input.line_items.map((item) => ({
                    item_id: item.item_id,
                    quantity: item.quantity,
                    ...(item.rate !== undefined && { rate: item.rate }),
                    ...(item.description !== undefined && { description: item.description }),
                    ...(item.tax_id !== undefined && { tax_id: item.tax_id })
                })),
                ...(input.invoice_number !== undefined && { invoice_number: input.invoice_number }),
                ...(input.date !== undefined && { date: input.date }),
                ...(input.due_date !== undefined && { due_date: input.due_date }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.terms !== undefined && { terms: input.terms }),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number })
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const invoice = providerResponse.invoice;

        return {
            invoice_id: invoice.invoice_id,
            invoice_number: invoice.invoice_number,
            customer_id: invoice.customer_id,
            status: invoice.status,
            ...(invoice.total !== undefined && { total: invoice.total }),
            ...(invoice.balance !== undefined && { balance: invoice.balance })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
