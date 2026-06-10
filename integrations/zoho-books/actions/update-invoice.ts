import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const LineItemInputSchema = z.object({
    item_id: z.string().describe('Item ID. Example: "260815000000100002"'),
    name: z.string().optional().describe('Line item name'),
    description: z.string().optional().describe('Line item description'),
    rate: z.number().optional().describe('Unit rate'),
    quantity: z.number().optional().describe('Quantity'),
    unit: z.string().optional().describe('Unit of measurement'),
    tax_id: z.string().optional().describe('Tax ID'),
    discount: z.number().optional().describe('Discount amount'),
    project_id: z.string().optional().describe('Project ID')
});

const InputSchema = z.object({
    invoice_id: z.string().describe('Invoice ID. Example: "260815000000101011"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    customer_id: z.string().optional().describe('Customer ID. Example: "260815000000097001"'),
    date: z.string().optional().describe('Invoice date (yyyy-mm-dd). Example: "2026-06-09"'),
    due_date: z.string().optional().describe('Due date (yyyy-mm-dd). Example: "2026-06-23"'),
    reference_number: z.string().optional().describe('External reference number'),
    notes: z.string().optional().describe('Notes for the customer'),
    terms: z.string().optional().describe('Terms & conditions'),
    line_items: z.array(LineItemInputSchema).optional().describe('Line items to replace existing items')
});

const ProviderLineItemSchema = z.object({
    line_item_id: z.string().optional(),
    item_id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    rate: z.number().optional(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
    tax_id: z.string().optional(),
    discount: z.number().optional(),
    item_total: z.number().optional()
});

const ProviderInvoiceSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    date: z.string().optional(),
    status: z.string().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    reference_number: z.string().optional(),
    line_items: z.array(ProviderLineItemSchema).optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    invoice: ProviderInvoiceSchema
});

const OutputSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    date: z.string().optional(),
    status: z.string().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    reference_number: z.string().optional(),
    line_items: z
        .array(
            z.object({
                line_item_id: z.string().optional(),
                item_id: z.string().optional(),
                name: z.string().optional(),
                description: z.string().optional(),
                rate: z.number().optional(),
                quantity: z.number().optional(),
                unit: z.string().optional(),
                tax_id: z.string().optional(),
                discount: z.number().optional(),
                item_total: z.number().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Update an invoice in Zoho Books',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-invoice'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.invoices.UPDATE'],

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

        const data: Record<string, unknown> = {};

        if (input.customer_id !== undefined) {
            data['customer_id'] = input.customer_id;
        }
        if (input.date !== undefined) {
            data['date'] = input.date;
        }
        if (input.due_date !== undefined) {
            data['due_date'] = input.due_date;
        }
        if (input.reference_number !== undefined) {
            data['reference_number'] = input.reference_number;
        }
        if (input.notes !== undefined) {
            data['notes'] = input.notes;
        }
        if (input.terms !== undefined) {
            data['terms'] = input.terms;
        }
        if (input.line_items !== undefined) {
            data['line_items'] = input.line_items;
        }

        // https://www.zoho.com/books/api/v3/invoices/#update-an-invoice
        const response = await nango.put({
            endpoint: `/books/v3/invoices/${encodeURIComponent(input.invoice_id)}`,
            params: {
                organization_id: organizationId
            },
            data,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const invoice = providerResponse.invoice;

        return {
            invoice_id: invoice.invoice_id,
            ...(invoice.invoice_number !== undefined && { invoice_number: invoice.invoice_number }),
            ...(invoice.customer_id !== undefined && { customer_id: invoice.customer_id }),
            ...(invoice.customer_name !== undefined && { customer_name: invoice.customer_name }),
            ...(invoice.date !== undefined && { date: invoice.date }),
            ...(invoice.status !== undefined && { status: invoice.status }),
            ...(invoice.total !== undefined && { total: invoice.total }),
            ...(invoice.balance !== undefined && { balance: invoice.balance }),
            ...(invoice.notes !== undefined && { notes: invoice.notes }),
            ...(invoice.terms !== undefined && { terms: invoice.terms }),
            ...(invoice.reference_number !== undefined && { reference_number: invoice.reference_number }),
            ...(invoice.line_items !== undefined && {
                line_items: invoice.line_items.map((item) => ({
                    ...(item.line_item_id !== undefined && { line_item_id: item.line_item_id }),
                    ...(item.item_id !== undefined && { item_id: item.item_id }),
                    ...(item.name !== undefined && { name: item.name }),
                    ...(item.description !== undefined && { description: item.description }),
                    ...(item.rate !== undefined && { rate: item.rate }),
                    ...(item.quantity !== undefined && { quantity: item.quantity }),
                    ...(item.unit !== undefined && { unit: item.unit }),
                    ...(item.tax_id !== undefined && { tax_id: item.tax_id }),
                    ...(item.discount !== undefined && { discount: item.discount }),
                    ...(item.item_total !== undefined && { item_total: item.item_total })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
