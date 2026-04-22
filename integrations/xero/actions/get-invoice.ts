import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('The Xero InvoiceID to retrieve. Example: "a3b2c1d0-e4f5-6789-abcd-ef0123456789"')
});

const LineItemSchema = z
    .object({
        LineItemID: z.string().optional(),
        Description: z.string().optional(),
        Quantity: z.number().optional(),
        UnitAmount: z.number().optional(),
        LineAmount: z.number().optional(),
        AccountCode: z.string().optional(),
        ItemCode: z.string().optional(),
        TaxType: z.string().optional(),
        TaxAmount: z.number().optional()
    })
    .passthrough();

const ContactSchema = z
    .object({
        ContactID: z.string().optional(),
        Name: z.string().optional(),
        ContactNumber: z.string().optional(),
        EmailAddress: z.string().optional()
    })
    .passthrough();

const InvoiceSchema = z
    .object({
        InvoiceID: z.string(),
        InvoiceNumber: z.string().optional(),
        Type: z.string().optional(),
        Contact: ContactSchema.optional(),
        Date: z.string().optional(),
        DueDate: z.string().optional(),
        Status: z.string().optional(),
        LineAmountTypes: z.string().optional(),
        LineItems: z.array(LineItemSchema).optional(),
        SubTotal: z.number().optional(),
        TotalTax: z.number().optional(),
        Total: z.number().optional(),
        AmountDue: z.number().optional(),
        AmountPaid: z.number().optional(),
        CurrencyCode: z.string().optional(),
        FullyPaidOnDate: z.string().optional(),
        Reference: z.string().optional(),
        BrandingThemeID: z.string().optional(),
        Url: z.string().optional(),
        SentToContact: z.boolean().optional(),
        HasAttachments: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    invoice: InvoiceSchema
});

/**
 * Resolve Xero tenant ID from connection configuration, metadata, or connections endpoint.
 * Priority order: connection_config['tenant_id'] > metadata['tenantId'] > GET connections (if exactly one)
 */
async function resolveTenantId(nango: {
    getConnection: () => Promise<{ connection_config?: Record<string, unknown> | null; metadata?: Record<string, unknown> | null }>;
    get: (config: { endpoint: string; retries: number }) => Promise<{ data?: unknown }>;
}): Promise<string> {
    const connection = await nango.getConnection();

    // Priority 1: connection_config['tenant_id']
    const configTenantId = connection.connection_config?.['tenant_id'];
    if (typeof configTenantId === 'string' && configTenantId) {
        return configTenantId;
    }

    // Priority 2: metadata['tenantId']
    const metadataTenantId = connection.metadata?.['tenantId'];
    if (typeof metadataTenantId === 'string' && metadataTenantId) {
        return metadataTenantId;
    }

    // Priority 3: Call GET connections and use first tenant if exactly one
    // https://developer.xero.com/documentation/api/accounting/overview#connections
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const connections = Array.isArray(connectionsResponse.data) ? connectionsResponse.data : [];

    if (connections.length === 1) {
        const firstConnection = connections[0];
        if (firstConnection && typeof firstConnection === 'object' && 'tenantId' in firstConnection && typeof firstConnection.tenantId === 'string') {
            return firstConnection.tenantId;
        }
    }

    if (connections.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    throw new Error('No tenant found. Please configure tenant_id in connection_config or tenantId in metadata.');
}

const action = createAction({
    description: 'Retrieve an invoice by InvoiceID',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-invoice',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        // https://developer.xero.com/documentation/api/accounting/invoices#get-invoice
        const response = await nango.get({
            endpoint: `api.xro/2.0/Invoices/${input.invoice_id}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Invoice not found: ${input.invoice_id}`
            });
        }

        // Parse the response to ensure it matches expected structure
        const responseData = typeof response.data === 'object' && response.data !== null ? response.data : {};
        const invoices = Array.isArray(responseData.Invoices) ? responseData.Invoices : [];
        const invoice = invoices[0];

        if (!invoice || typeof invoice !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Invoice not found: ${input.invoice_id}`
            });
        }

        // Validate the invoice against our schema
        const validatedInvoice = InvoiceSchema.parse(invoice);

        return {
            invoice: validatedInvoice
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
