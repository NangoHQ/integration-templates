import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    description: z.string().describe('Description of the line item. Example: "Consulting services"'),
    quantity: z.number().describe('Quantity of the line item. Example: 2'),
    unit_amount: z.number().describe('Unit price of the line item. Example: 100.00'),
    account_code: z.string().describe('Account code for the line item. Example: "400"'),
    item_code: z.string().optional().describe('Xero inventory item code for the line item. Example: "ITEM-001"'),
    tax_type: z.string().optional().describe('Tax type for the line item. Example: "OUTPUT2"')
});

const ContactInputSchema = z.object({
    contact_id: z.string().describe('Xero Contact ID to associate with the invoice. Example: "de917205-1599-4dd4-b319-4adf72eadfe3"')
});

const InputSchema = z
    .object({
        type: z.enum(['ACCREC', 'ACCPAY']).describe('Invoice type. ACCREC = sales invoice, ACCPAY = purchase invoice.'),
        contact: ContactInputSchema.describe('Contact to associate with the invoice.'),
        date: z.string().describe('Invoice date in YYYY-MM-DD format. Example: "2026-08-11"'),
        due_date: z.string().optional().describe('Due date in YYYY-MM-DD format. Omit to use the contact payment terms.'),
        reference: z.string().optional().describe('Reference text for the invoice. Example: "PO-1234"'),
        line_items: z.array(LineItemInputSchema).describe('Line items for the invoice.'),
        status: z
            .enum(['DRAFT', 'SUBMITTED', 'AUTHORISED'])
            .optional()
            .describe('Invoice status. AUTHORISED posts immediately; DRAFT leaves it editable. Defaults to DRAFT if omitted.')
    })
    .describe('Input for creating a Xero invoice.');

const ProviderContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional()
});

const ProviderLineItemSchema = z.object({
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    LineItemID: z.string().optional(),
    ItemCode: z.string().optional(),
    TaxType: z.string().optional()
});

const ProviderInvoiceSchema = z.object({
    InvoiceID: z.string().optional(),
    InvoiceNumber: z.string().optional(),
    Type: z.string().optional(),
    Status: z.string().optional(),
    Contact: ProviderContactSchema.optional(),
    Date: z.string().optional(),
    DueDate: z.string().optional(),
    Reference: z.string().optional(),
    LineItems: z.array(ProviderLineItemSchema).optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    UpdatedDateUTC: z.string().optional()
});

const ProviderResponseSchema = z.object({
    Id: z.string().optional(),
    Status: z.string().optional(),
    ProviderName: z.string().optional(),
    DateTimeUTC: z.string().optional(),
    Invoices: z.array(ProviderInvoiceSchema).optional()
});

const LineItemOutputSchema = z.object({
    line_item_id: z.string().optional().describe('Xero Line Item ID.'),
    description: z.string().optional().describe('Description of the line item.'),
    quantity: z.number().optional().describe('Quantity of the line item.'),
    unit_amount: z.number().optional().describe('Unit price of the line item.'),
    account_code: z.string().optional().describe('Account code for the line item.'),
    item_code: z.string().optional().describe('Xero inventory item code for the line item.'),
    tax_type: z.string().optional().describe('Tax type for the line item.')
});

const ContactOutputSchema = z.object({
    contact_id: z.string().optional().describe('Xero Contact ID.'),
    name: z.string().optional().describe('Name of the contact.')
});

const OutputSchema = z
    .object({
        invoice_id: z.string().optional().describe('Xero Invoice ID.'),
        invoice_number: z.string().optional().describe('Invoice number assigned by Xero.'),
        type: z.string().optional().describe('Invoice type (ACCREC or ACCPAY).'),
        status: z.string().optional().describe('Invoice status.'),
        contact: ContactOutputSchema.optional().describe('Contact associated with the invoice.'),
        date: z.string().optional().describe('Invoice date.'),
        due_date: z.string().optional().describe('Invoice due date.'),
        reference: z.string().optional().describe('Reference text for the invoice.'),
        line_items: z.array(LineItemOutputSchema).optional().describe('Line items on the invoice.'),
        sub_total: z.number().optional().describe('Subtotal before tax.'),
        total_tax: z.number().optional().describe('Total tax amount.'),
        total: z.number().optional().describe('Total amount including tax.')
    })
    .describe('Created Xero invoice.');

/**
 * @tags: [write]
 * @tagReason: Creates a new invoice in the Xero organization.
 * @pitfalls: Archived contacts remain gettable by ID but will cause a validation error when used for a new invoice. An AUTHORISED invoice posts immediately and must be voided before it can be deleted.
 */
const action = createAction({
    description: 'Create a sales or purchase invoice.',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionData = z
            .object({
                connection_config: z.object({ tenant_id: z.string().optional() }).nullish(),
                metadata: z.union([z.object({}).passthrough(), z.null()]).optional()
            })
            .parse(connection);

        let tenantId: string | undefined = connectionData.connection_config?.tenant_id;
        if (!tenantId && connectionData.metadata && typeof connectionData.metadata === 'object' && 'tenantId' in connectionData.metadata) {
            const metaTenantId = connectionData.metadata['tenantId'];
            if (typeof metaTenantId === 'string') {
                tenantId = metaTenantId;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = z.array(z.object({}).passthrough()).parse(connectionsResponse.data);
            if (connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }
            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
            const firstConnection = connectionsData[0];
            if (firstConnection && typeof firstConnection === 'object' && 'tenantId' in firstConnection && typeof firstConnection['tenantId'] === 'string') {
                tenantId = firstConnection['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const invoicePayload: Record<string, unknown> = {
            Type: input.type,
            Contact: {
                ContactID: input.contact.contact_id
            },
            Date: input.date,
            LineItems: input.line_items.map((item) => ({
                Description: item.description,
                Quantity: item.quantity,
                UnitAmount: item.unit_amount,
                AccountCode: item.account_code,
                ...(item.item_code !== undefined && { ItemCode: item.item_code }),
                ...(item.tax_type !== undefined && { TaxType: item.tax_type })
            }))
        };

        if (input.due_date !== undefined) {
            invoicePayload['DueDate'] = input.due_date;
        }

        if (input.reference !== undefined) {
            invoicePayload['Reference'] = input.reference;
        }

        if (input.status !== undefined) {
            invoicePayload['Status'] = input.status;
        }

        // https://developer.xero.com/documentation/api/accounting/invoices
        const response = await nango.put({
            endpoint: 'api.xro/2.0/Invoices',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Invoices: [invoicePayload]
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const invoices = providerResponse.Invoices;

        if (!invoices || invoices.length === 0) {
            throw new nango.ActionError({
                type: 'no_invoice_returned',
                message: 'Xero did not return an invoice in the response.'
            });
        }

        const created = invoices[0];
        if (!created) {
            throw new nango.ActionError({
                type: 'no_invoice_returned',
                message: 'Xero did not return an invoice in the response.'
            });
        }

        return {
            ...(created.InvoiceID !== undefined && { invoice_id: created.InvoiceID }),
            ...(created.InvoiceNumber !== undefined && { invoice_number: created.InvoiceNumber }),
            ...(created.Type !== undefined && { type: created.Type }),
            ...(created.Status !== undefined && { status: created.Status }),
            ...(created.Contact !== undefined && {
                contact: {
                    ...(created.Contact.ContactID !== undefined && { contact_id: created.Contact.ContactID }),
                    ...(created.Contact.Name !== undefined && { name: created.Contact.Name })
                }
            }),
            ...(created.Date !== undefined && { date: created.Date }),
            ...(created.DueDate !== undefined && { due_date: created.DueDate }),
            ...(created.Reference !== undefined && { reference: created.Reference }),
            ...(created.LineItems !== undefined && {
                line_items: created.LineItems.map((item) => ({
                    ...(item.LineItemID !== undefined && { line_item_id: item.LineItemID }),
                    ...(item.Description !== undefined && { description: item.Description }),
                    ...(item.Quantity !== undefined && { quantity: item.Quantity }),
                    ...(item.UnitAmount !== undefined && { unit_amount: item.UnitAmount }),
                    ...(item.AccountCode !== undefined && { account_code: item.AccountCode }),
                    ...(item.ItemCode !== undefined && { item_code: item.ItemCode }),
                    ...(item.TaxType !== undefined && { tax_type: item.TaxType })
                }))
            }),
            ...(created.SubTotal !== undefined && { sub_total: created.SubTotal }),
            ...(created.TotalTax !== undefined && { total_tax: created.TotalTax }),
            ...(created.Total !== undefined && { total: created.Total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
