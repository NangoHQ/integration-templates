import { z } from 'zod';
import { createAction } from 'nango';

const LineItemSchema = z
    .object({
        item_id: z.string().optional().describe('Catalog item ID to bill. Omit it to bill an ad-hoc/free-text line item.'),
        name: z
            .string()
            .optional()
            .describe('Name of the line item. Required for ad-hoc items; defaults to the catalog item name when item_id is set. Example: "Consulting".'),
        description: z.string().optional().describe('Description of the line item.'),
        rate: z.number().describe('Unit price of the line item. Example: 150.'),
        quantity: z.number().describe('Quantity billed for the line item. Example: 2.'),
        unit: z.string().optional().describe('Unit of measure for the line item. Example: "hours".'),
        tax_id: z.string().optional().describe('ID of the tax or tax group applied to the line item.')
    })
    .describe('A single invoice line item.');

const InputSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID that owns the invoice. Required on every request.'),
        customer_id: z.string().describe('ID of the existing customer (contact) to invoice.'),
        line_items: z.array(LineItemSchema).min(1).describe('Line items to bill on the invoice. At least one is required.'),
        date: z.string().optional().describe('Invoice date in yyyy-mm-dd format. Defaults to the current date when omitted.'),
        due_date: z.string().optional().describe('Payment due date in yyyy-mm-dd format.'),
        reference_number: z.string().optional().describe('Optional reference number stored on the invoice.'),
        payment_terms: z.number().int().optional().describe('Payment terms in days (e.g. 15, 30, 60). Used to derive the due date when due_date is omitted.'),
        notes: z.string().optional().describe('Notes shown on the invoice.'),
        terms: z.string().optional().describe('Terms and conditions shown on the invoice.')
    })
    .describe('Input for creating a Zoho Invoice invoice.');

const ProviderInvoiceSchema = z.object({
    invoice_id: z.union([z.string(), z.number()]),
    invoice_number: z.union([z.string(), z.number()]).nullish(),
    status: z.string().nullish(),
    date: z.string().nullish(),
    due_date: z.string().nullish(),
    total: z.union([z.string(), z.number()]).nullish(),
    balance: z.union([z.string(), z.number()]).nullish(),
    customer_id: z.union([z.string(), z.number()]).nullish(),
    customer_name: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    invoice: ProviderInvoiceSchema.optional()
});

const OutputSchema = z
    .object({
        invoice_id: z.string().describe('Provider ID of the newly created invoice.'),
        invoice_number: z.string().optional().describe('Human-readable invoice number assigned by Zoho.'),
        status: z.string().optional().describe('Invoice status right after creation, typically "draft".'),
        date: z.string().optional().describe('Invoice date in yyyy-mm-dd format.'),
        due_date: z.string().optional().describe('Payment due date in yyyy-mm-dd format.'),
        total: z.number().optional().describe('Total amount of the invoice.'),
        balance: z.number().optional().describe('Outstanding balance, equal to the total while unpaid.'),
        customer_id: z.string().optional().describe('Provider ID of the billed customer.'),
        customer_name: z.string().optional().describe('Name of the billed customer.')
    })
    .describe('The newly created invoice.');

/**
 * @tags: [write]
 * @tagReason: Creates a new invoice in the provider.
 * @pitfalls: Invoices are created in "draft" status and are not emailed automatically; creation can be rejected by the provider's plan/invoice quota even for otherwise valid input; organization_id must be supplied by the caller because it cannot be discovered through this connection's granted scopes.
 */
const action = createAction({
    description: 'Create a new invoice for a customer. Line items do not require a catalog item_id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.invoices.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.line_items.some((lineItem) => lineItem.item_id === undefined && lineItem.name === undefined)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Each line item needs either an item_id or a name.'
            });
        }

        const response = await nango.post<unknown>({
            // https://www.zoho.com/invoice/api/v3/invoices/#create-an-invoice
            endpoint: '/invoice/v3/invoices',
            params: {
                organization_id: input.organization_id
            },
            data: {
                customer_id: input.customer_id,
                line_items: input.line_items.map((lineItem) => ({
                    ...(lineItem.item_id !== undefined && { item_id: lineItem.item_id }),
                    ...(lineItem.name !== undefined && { name: lineItem.name }),
                    ...(lineItem.description !== undefined && { description: lineItem.description }),
                    rate: lineItem.rate,
                    quantity: lineItem.quantity,
                    ...(lineItem.unit !== undefined && { unit: lineItem.unit }),
                    ...(lineItem.tax_id !== undefined && { tax_id: lineItem.tax_id })
                })),
                ...(input.date !== undefined && { date: input.date }),
                ...(input.due_date !== undefined && { due_date: input.due_date }),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.payment_terms !== undefined && { payment_terms: input.payment_terms }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.terms !== undefined && { terms: input.terms })
            },
            // Non-idempotent POST without an idempotency key: a retry after a lost response would create a duplicate invoice.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'create_invoice_failed',
                message: 'The provider returned an unexpected response while creating the invoice.'
            });
        }

        const providerData = parsed.data;
        if (providerData.code !== 0 || !providerData.invoice) {
            throw new nango.ActionError({
                type: 'create_invoice_failed',
                message: providerData.message ?? 'The provider rejected the invoice creation request.'
            });
        }

        const invoice = providerData.invoice;

        return {
            invoice_id: String(invoice.invoice_id),
            ...(invoice.invoice_number != null && { invoice_number: String(invoice.invoice_number) }),
            ...(invoice.status != null && { status: invoice.status }),
            ...(invoice.date != null && { date: invoice.date }),
            ...(invoice.due_date != null && { due_date: invoice.due_date }),
            ...(invoice.total != null && { total: Number(invoice.total) }),
            ...(invoice.balance != null && { balance: Number(invoice.balance) }),
            ...(invoice.customer_id != null && { customer_id: String(invoice.customer_id) }),
            ...(invoice.customer_name != null && { customer_name: invoice.customer_name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
