import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z
    .object({
        item_id: z.string().describe('ID of the item being invoiced. Example: "260815000000101002"'),
        quantity: z.number().describe('Quantity of the item being invoiced. Example: 2'),
        rate: z.number().describe('Unit rate of the item being invoiced. Example: 150'),
        name: z.string().optional().describe('Display name of the line item. Defaults to the item name when omitted.'),
        description: z.string().optional().describe('Free-text description shown for the line item.')
    })
    .describe('A single line item to place on the invoice.');

const InputSchema = z
    .object({
        customer_id: z.string().describe('ID of the customer the invoice is created for. Example: "260815000000097001"'),
        line_items: z.array(LineItemInputSchema).describe('Line items to place on the invoice. At least one is required.'),
        invoice_number: z.string().optional().describe('Invoice number to assign. Rejected when the organization has invoice-number auto-generation enabled.'),
        date: z.string().optional().describe('Invoice date in yyyy-mm-dd format. Defaults to the current date when omitted. Example: "2026-10-09"'),
        due_date: z.string().optional().describe('Payment due date in yyyy-mm-dd format. Defaults to the date derived from the payment terms when omitted.'),
        reference_number: z.string().optional().describe('Free-text reference number stored on the invoice.'),
        salesorder_id: z
            .string()
            .optional()
            .describe('Sales order ID to associate with the invoice. Accepted by the API but does not actually link the invoice to the order.')
    })
    .describe('Input for creating a new invoice in Zoho Inventory.');

const ProviderOrganizationSchema = z.object({
    organization_id: z.union([z.string(), z.number()])
});

const ProviderOrganizationsSchema = z.object({
    organizations: z.array(ProviderOrganizationSchema)
});

const ProviderInvoiceSchema = z.object({
    invoice_id: z.union([z.string(), z.number()]),
    invoice_number: z.string().optional(),
    status: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    customer_id: z.union([z.string(), z.number()]).optional(),
    customer_name: z.string().optional(),
    reference_number: z.string().optional(),
    salesorder_id: z.union([z.string(), z.number()]).optional(),
    sub_total: z.number().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    currency_code: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const ProviderInvoiceResponseSchema = z.object({
    invoice: ProviderInvoiceSchema
});

const OutputSchema = z
    .object({
        invoice_id: z.string().describe('ID of the created invoice. Example: "260815000000162245"'),
        invoice_number: z.string().optional().describe('Invoice number assigned by Zoho Inventory.'),
        status: z.string().optional().describe('Invoice status. Newly created invoices are usually "draft".'),
        date: z.string().optional().describe('Invoice date in yyyy-mm-dd format.'),
        due_date: z.string().optional().describe('Payment due date in yyyy-mm-dd format.'),
        customer_id: z.string().optional().describe('ID of the customer the invoice was created for.'),
        customer_name: z.string().optional().describe('Display name of the customer the invoice was created for.'),
        reference_number: z.string().optional().describe('Reference number stored on the invoice.'),
        salesorder_id: z.string().optional().describe('Linked sales order ID, if any. Empty for invoices created through this action.'),
        sub_total: z.number().optional().describe('Invoice subtotal before taxes, discounts and adjustments.'),
        total: z.number().optional().describe('Final invoice total.'),
        balance: z.number().optional().describe('Outstanding balance still owed on the invoice.'),
        currency_code: z.string().optional().describe('ISO currency code of the invoice. Example: "USD"'),
        created_time: z.string().optional().describe('Timestamp when the invoice was created.'),
        last_modified_time: z.string().optional().describe('Timestamp when the invoice was last modified.')
    })
    .describe('Details of the created Zoho Inventory invoice.');

/**
 * @tags: [write]
 * @tagReason: Creates a new invoice in Zoho Inventory through the provider's API.
 * @pitfalls: salesorder_id is silently accepted but does not link the invoice to the sales order, so the created invoice's salesorder_id stays empty and the order is not marked invoiced. If the organization uses invoice-number auto-generation, passing invoice_number is rejected instead of being overridden.
 */
const action = createAction({
    description: 'Create a new invoice for a customer.',
    version: '1.0.0',
    scopes: ['ZohoInventory.invoices.CREATE'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const orgResponse = await nango.get({
            // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
            endpoint: '/inventory/v1/organizations',
            retries: 3
        });

        const organizations = ProviderOrganizationsSchema.parse(orgResponse.data).organizations;
        const organization = organizations[0];

        if (!organization) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No Zoho Inventory organization is available for this connection.'
            });
        }

        const organizationId = String(organization.organization_id);

        const lineItems = input.line_items.map((lineItem) => ({
            item_id: lineItem.item_id,
            quantity: lineItem.quantity,
            rate: lineItem.rate,
            ...(lineItem.name !== undefined && { name: lineItem.name }),
            ...(lineItem.description !== undefined && { description: lineItem.description })
        }));

        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/invoices/#create-an-invoice
            endpoint: '/inventory/v1/invoices',
            params: {
                organization_id: organizationId
            },
            data: {
                customer_id: input.customer_id,
                line_items: lineItems,
                ...(input.invoice_number !== undefined && { invoice_number: input.invoice_number }),
                ...(input.date !== undefined && { date: input.date }),
                ...(input.due_date !== undefined && { due_date: input.due_date }),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.salesorder_id !== undefined && { salesorder_id: input.salesorder_id })
            },
            // Non-idempotent create; a retry after a lost response would create a duplicate invoice, so retries must stay 0.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- deliberately 0 for this non-idempotent create
            retries: 0
        });

        const invoice = ProviderInvoiceResponseSchema.parse(response.data).invoice;

        return {
            invoice_id: String(invoice.invoice_id),
            ...(invoice.invoice_number != null && { invoice_number: invoice.invoice_number }),
            ...(invoice.status != null && { status: invoice.status }),
            ...(invoice.date != null && { date: invoice.date }),
            ...(invoice.due_date != null && { due_date: invoice.due_date }),
            ...(invoice.customer_id != null && { customer_id: String(invoice.customer_id) }),
            ...(invoice.customer_name != null && { customer_name: invoice.customer_name }),
            ...(invoice.reference_number != null && { reference_number: invoice.reference_number }),
            ...(invoice.salesorder_id != null && { salesorder_id: String(invoice.salesorder_id) }),
            ...(invoice.sub_total != null && { sub_total: invoice.sub_total }),
            ...(invoice.total != null && { total: invoice.total }),
            ...(invoice.balance != null && { balance: invoice.balance }),
            ...(invoice.currency_code != null && { currency_code: invoice.currency_code }),
            ...(invoice.created_time != null && { created_time: invoice.created_time }),
            ...(invoice.last_modified_time != null && { last_modified_time: invoice.last_modified_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
