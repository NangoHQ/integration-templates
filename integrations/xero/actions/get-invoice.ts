import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    InvoiceID: z.string().describe('The Xero InvoiceID. Example: "00000000-0000-0000-0000-000000000000"')
});

const ContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional()
});

const LineItemSchema = z.object({
    LineItemID: z.string().optional(),
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    LineAmount: z.number().optional()
});

const ProviderInvoiceSchema = z
    .object({
        InvoiceID: z.string(),
        InvoiceNumber: z.string().optional(),
        Type: z.string().optional(),
        Contact: ContactSchema.optional(),
        Date: z.string().optional(),
        DueDate: z.string().optional(),
        Status: z.string().optional(),
        LineItems: z.array(LineItemSchema).optional(),
        SubTotal: z.number().optional(),
        TotalTax: z.number().optional(),
        Total: z.number().optional(),
        UpdatedDateUTC: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    InvoiceID: z.string(),
    InvoiceNumber: z.string().optional(),
    Type: z.string().optional(),
    Contact: ContactSchema.optional(),
    Date: z.string().optional(),
    DueDate: z.string().optional(),
    Status: z.string().optional(),
    LineItems: z.array(LineItemSchema).optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    UpdatedDateUTC: z.string().optional()
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const TenantConnectionSchema = z.object({
    tenantId: z.string()
});

const InvoicesResponseSchema = z.object({
    Invoices: z.array(ProviderInvoiceSchema).optional()
});

const action = createAction({
    description: 'Retrieve an invoice by InvoiceID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-invoice',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices.read', 'accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connectionRaw = await nango.getConnection();
        const connection = ConnectionSchema.parse(connectionRaw);

        let tenantId: string | undefined;

        const configTenantId = connection.connection_config?.['tenant_id'];
        if (typeof configTenantId === 'string') {
            tenantId = configTenantId;
        }

        if (tenantId === undefined) {
            const metadataTenantId = connection.metadata?.['tenantId'];
            if (typeof metadataTenantId === 'string') {
                tenantId = metadataTenantId;
            }
        }

        if (tenantId === undefined) {
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/guides/oauth2/connections
                endpoint: 'https://api.xero.com/connections',
                retries: 10
            });
            const connections = z.array(TenantConnectionSchema).parse(connectionsResponse.data);

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenant found for this connection.'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            if (connections.length !== 1) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenant found for this connection.'
                });
            }

            const firstConnection = connections[0];
            if (!firstConnection) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenant found for this connection.'
                });
            }

            tenantId = firstConnection.tenantId;
        }

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/invoices
            endpoint: `api.xro/2.0/Invoices/${input.InvoiceID}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsed = InvoicesResponseSchema.parse(response.data);
        const invoice = parsed.Invoices?.[0];

        if (!invoice) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Invoice not found',
                InvoiceID: input.InvoiceID
            });
        }

        return {
            InvoiceID: invoice.InvoiceID,
            ...(invoice.InvoiceNumber !== undefined && { InvoiceNumber: invoice.InvoiceNumber }),
            ...(invoice.Type !== undefined && { Type: invoice.Type }),
            ...(invoice.Contact !== undefined && { Contact: invoice.Contact }),
            ...(invoice.Date !== undefined && { Date: invoice.Date }),
            ...(invoice.DueDate !== undefined && { DueDate: invoice.DueDate }),
            ...(invoice.Status !== undefined && { Status: invoice.Status }),
            ...(invoice.LineItems !== undefined && { LineItems: invoice.LineItems }),
            ...(invoice.SubTotal !== undefined && { SubTotal: invoice.SubTotal }),
            ...(invoice.TotalTax !== undefined && { TotalTax: invoice.TotalTax }),
            ...(invoice.Total !== undefined && { Total: invoice.Total }),
            ...(invoice.UpdatedDateUTC !== undefined && { UpdatedDateUTC: invoice.UpdatedDateUTC })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
