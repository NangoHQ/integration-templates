import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('The unique ID of the invoice to update. Example: "12345678-1234-1234-1234-123456789012"'),
    type: z.enum(['ACCREC', 'ACCPAY']).optional().describe('Invoice type: ACCREC (Sales Invoice) or ACCPAY (Bill).'),
    contact: z
        .object({
            contact_id: z.string().optional().describe('The Xero ID for the contact.'),
            name: z.string().optional().describe('The full name of the contact or organisation.')
        })
        .optional()
        .describe('The contact associated with the invoice.'),
    line_items: z
        .array(
            z.object({
                line_item_id: z.string().optional().describe('The Xero ID for the line item (for existing items).'),
                description: z.string().optional().describe('Description of the line item.'),
                quantity: z.number().optional().describe('Quantity of the line item.'),
                unit_amount: z.number().optional().describe('Unit price of the line item.'),
                account_code: z.string().optional().describe('Account code for the line item.'),
                tax_type: z.string().optional().describe('Tax type for the line item.')
            })
        )
        .optional()
        .describe('Line items for the invoice.'),
    date: z.string().optional().describe('Invoice date in YYYY-MM-DD format.'),
    due_date: z.string().optional().describe('Due date for the invoice in YYYY-MM-DD format.'),
    reference: z.string().optional().describe('Reference text for the invoice.'),
    status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID', 'VOIDED', 'DELETED']).optional().describe('Status of the invoice.')
});

const OutputSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string(),
    type: z.string(),
    status: z.string(),
    total: z.number(),
    currency_code: z.string(),
    updated_date_utc: z.string()
});

// Zod schema for Xero API response validation
const XeroInvoiceResponseSchema = z.object({
    Id: z.string(),
    Status: z.string(),
    ProviderName: z.string(),
    DateTimeUTC: z.string(),
    Invoices: z.array(
        z.object({
            InvoiceID: z.string(),
            InvoiceNumber: z.string().optional(),
            Type: z.string().optional(),
            Status: z.string().optional(),
            Total: z.number().optional(),
            CurrencyCode: z.string().optional(),
            UpdatedDateUTC: z.string().optional()
        })
    )
});

// Zod schema for Connections API response
const ConnectionsResponseSchema = z.object({
    data: z.array(
        z.object({
            id: z.string(),
            tenantId: z.string(),
            tenantName: z.string().optional()
        })
    )
});

async function resolveTenantId(nango: Parameters<ReturnType<typeof createAction>['exec']>[0]): Promise<string> {
    // 1. Check connection.connection_config['tenant_id']
    const connection = await nango.getConnection();

    if (connection && typeof connection === 'object') {
        const connectionConfig = connection.connection_config;
        if (connectionConfig && typeof connectionConfig === 'object' && connectionConfig['tenant_id']) {
            const tenantId = connectionConfig['tenant_id'];
            if (typeof tenantId === 'string' && tenantId.length > 0) {
                return tenantId;
            }
        }

        // 2. Check connection.metadata['tenantId']
        const metadata = connection.metadata;
        if (metadata && typeof metadata === 'object' && metadata['tenantId']) {
            const tenantId = metadata['tenantId'];
            if (typeof tenantId === 'string' && tenantId.length > 0) {
                return tenantId;
            }
        }
    }

    // 3. Call GET connections and use first tenant if only one exists
    // https://developer.xero.com/documentation/api/accounting/overview#connections
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const parsedConnections = ConnectionsResponseSchema.parse(connectionsResponse.data);
    const connections = parsedConnections.data;

    if (connections.length === 0) {
        throw new nango.ActionError({
            type: 'missing_tenant',
            message: 'No Xero tenants found for this connection.'
        });
    }

    if (connections.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const firstConnection = connections[0];
    if (firstConnection === undefined) {
        throw new nango.ActionError({
            type: 'missing_tenant',
            message: 'No Xero tenants found for this connection.'
        });
    }

    return firstConnection.tenantId;
}

const action = createAction({
    description: 'Update an existing invoice in Xero.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-invoice',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        // Build the invoice update payload
        const invoicePayload: Record<string, unknown> = {
            InvoiceID: input.invoice_id
        };

        if (input.type) {
            invoicePayload['Type'] = input.type;
        }

        if (input.contact) {
            const contactPayload: Record<string, string> = {};
            if (input.contact.contact_id) {
                contactPayload['ContactID'] = input.contact.contact_id;
            }
            if (input.contact.name) {
                contactPayload['Name'] = input.contact.name;
            }
            invoicePayload['Contact'] = contactPayload;
        }

        if (input.line_items && input.line_items.length > 0) {
            invoicePayload['LineItems'] = input.line_items.map((item) => {
                const lineItem: Record<string, unknown> = {};
                if (item.line_item_id) {
                    lineItem['LineItemID'] = item.line_item_id;
                }
                if (item.description) {
                    lineItem['Description'] = item.description;
                }
                if (typeof item.quantity === 'number') {
                    lineItem['Quantity'] = item.quantity;
                }
                if (typeof item.unit_amount === 'number') {
                    lineItem['UnitAmount'] = item.unit_amount;
                }
                if (item.account_code) {
                    lineItem['AccountCode'] = item.account_code;
                }
                if (item.tax_type) {
                    lineItem['TaxType'] = item.tax_type;
                }
                return lineItem;
            });
        }

        if (input.date) {
            invoicePayload['Date'] = input.date;
        }

        if (input.due_date) {
            invoicePayload['DueDate'] = input.due_date;
        }

        if (input.reference) {
            invoicePayload['Reference'] = input.reference;
        }

        if (input.status) {
            invoicePayload['Status'] = input.status;
        }

        // https://developer.xero.com/documentation/api/accounting/invoices
        const response = await nango.post({
            endpoint: 'api.xro/2.0/Invoices',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Invoices: [invoicePayload]
            },
            retries: 3
        });

        const parsedResponse = XeroInvoiceResponseSchema.parse(response.data);
        const invoices = parsedResponse.Invoices;

        if (invoices.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No invoice returned from Xero after update.',
                invoice_id: input.invoice_id
            });
        }

        const updatedInvoice = invoices[0];

        if (updatedInvoice === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No invoice returned from Xero after update.',
                invoice_id: input.invoice_id
            });
        }

        return {
            invoice_id: updatedInvoice.InvoiceID,
            invoice_number: updatedInvoice.InvoiceNumber || '',
            type: updatedInvoice.Type || '',
            status: updatedInvoice.Status || '',
            total: updatedInvoice.Total || 0,
            currency_code: updatedInvoice.CurrencyCode || '',
            updated_date_utc: updatedInvoice.UpdatedDateUTC || ''
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
