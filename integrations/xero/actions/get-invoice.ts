import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        invoiceId: z.string().describe('The Xero InvoiceID to retrieve. Example: "06c18279-c848-4b69-b434-6b9fecc75a47"')
    })
    .describe('Input parameters for retrieving a Xero invoice by ID.');

const ContactSchema = z
    .object({
        ContactID: z.string().describe('Unique identifier for the contact'),
        Name: z.string().describe('Name of the contact')
    })
    .passthrough();

const LineItemSchema = z
    .object({
        LineItemID: z.string().optional().describe('Unique identifier for the line item'),
        Description: z.string().optional().describe('Description of the line item'),
        Quantity: z.number().optional().describe('Quantity of the line item'),
        UnitAmount: z.number().optional().describe('Unit price of the line item'),
        AccountCode: z.string().optional().describe('Account code for the line item'),
        TaxType: z.string().optional().describe('Tax type applied to the line item'),
        LineAmount: z.number().optional().describe('Total amount for the line item')
    })
    .passthrough();

const OutputSchema = z
    .object({
        InvoiceID: z.string().describe('Unique identifier for the invoice'),
        InvoiceNumber: z.string().optional().describe('Invoice number assigned by Xero'),
        Type: z.string().optional().describe('Type of invoice (e.g. ACCREC, ACCPAY)'),
        Status: z.string().optional().describe('Current status of the invoice (e.g. DRAFT, AUTHORISED, DELETED)'),
        Contact: ContactSchema.optional().describe('Contact associated with the invoice'),
        Date: z.string().optional().describe('Date of the invoice in YYYY-MM-DD format'),
        DueDate: z.string().optional().describe('Due date of the invoice in YYYY-MM-DD format'),
        LineItems: z.array(LineItemSchema).optional().describe('Line items on the invoice'),
        SubTotal: z.number().optional().describe('Subtotal of the invoice excluding tax'),
        TotalTax: z.number().optional().describe('Total tax on the invoice'),
        Total: z.number().optional().describe('Total amount of the invoice including tax'),
        UpdatedDateUTC: z.string().optional().describe('Last modified timestamp in UTC')
    })
    .passthrough()
    .describe('A single Xero invoice record returned by the Accounting API.');

const ConnectionConfigSchema = z
    .object({
        tenant_id: z.string().optional()
    })
    .nullish();

const MetadataSchema = z
    .object({
        tenantId: z.string().optional()
    })
    .nullish();

const ConnectionSchema = z.object({
    connection_config: ConnectionConfigSchema,
    metadata: MetadataSchema
});

const ProviderResponseSchema = z.object({
    Invoices: z.array(z.unknown())
});

const ProviderInvoiceSchema = z
    .object({
        InvoiceID: z.string()
    })
    .passthrough();

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing invoice by ID from the Xero Accounting API.
 * @pitfalls: Invoices deleted in Xero remain gettable forever and return Status DELETED instead of a not-found error.
 */
const action = createAction({
    description: 'Retrieve an invoice by InvoiceID.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = ConnectionSchema.parse(await nango.getConnection());
        const configTenantId = connection.connection_config?.tenant_id;
        const metadataTenantId = connection.metadata?.tenantId;
        let tenantId: string | undefined =
            configTenantId && configTenantId.length > 0 ? configTenantId : metadataTenantId && metadataTenantId.length > 0 ? metadataTenantId : undefined;

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/overview/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const connectionsData = connectionsResponse.data;
            if (!Array.isArray(connectionsData) || connectionsData.length === 0) {
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
            const firstConnection = z.object({ tenantId: z.string() }).passthrough().safeParse(connectionsData[0]);
            if (firstConnection.success && firstConnection.data.tenantId.length > 0) {
                tenantId = firstConnection.data.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.get({
            endpoint: `api.xro/2.0/Invoices/${encodeURIComponent(input.invoiceId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const rawInvoices = providerResponse.Invoices.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null);

        if (rawInvoices.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Invoice ${input.invoiceId} not found.`
            });
        }

        const rawInvoice = ProviderInvoiceSchema.parse(rawInvoices[0]);

        // Normalize upstream null values to omission for cleaner output
        const invoice: Record<string, unknown> = { ...rawInvoice };
        for (const key of Object.keys(invoice)) {
            if (invoice[key] === null) {
                delete invoice[key];
            }
        }

        return OutputSchema.parse(invoice);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
