import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        InvoiceID: z.string().uuid().describe('The Xero Invoice ID to update.')
    })
    .passthrough();

const ContactSchema = z
    .object({
        ContactID: z.string().optional(),
        Name: z.string().optional()
    })
    .passthrough();

const LineItemSchema = z
    .object({
        LineItemID: z.string().optional(),
        Description: z.string().optional(),
        Quantity: z.number().optional(),
        UnitAmount: z.number().optional(),
        AccountCode: z.string().optional(),
        TaxType: z.string().optional(),
        LineAmount: z.number().optional(),
        TaxAmount: z.number().optional(),
        DiscountRate: z.number().optional(),
        DiscountAmount: z.number().optional(),
        ItemCode: z.string().optional()
    })
    .passthrough();

const ProviderInvoiceSchema = z
    .object({
        InvoiceID: z.string(),
        InvoiceNumber: z.string().optional(),
        Type: z.string().optional(),
        Status: z.string().optional(),
        Date: z.string().optional(),
        DueDate: z.string().optional(),
        LineAmountTypes: z.string().optional(),
        Reference: z.string().nullable().optional(),
        CurrencyCode: z.string().optional(),
        SubTotal: z.number().optional(),
        TotalTax: z.number().optional(),
        Total: z.number().optional(),
        AmountDue: z.number().optional(),
        AmountPaid: z.number().optional(),
        UpdatedDateUTC: z.string().optional(),
        HasErrors: z.boolean().optional(),
        ValidationErrors: z.array(z.object({}).passthrough()).optional(),
        Contact: ContactSchema.optional(),
        LineItems: z.array(LineItemSchema).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    Id: z.string(),
    Status: z.string(),
    ProviderName: z.string(),
    DateTimeUTC: z.string(),
    Invoices: z.array(ProviderInvoiceSchema)
});

const OutputSchema = ProviderInvoiceSchema;

const action = createAction({
    description: 'Update an existing invoice.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-invoice',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/invoices
            endpoint: 'api.xro/2.0/Invoices',
            headers: {
                'xero-tenant-id': tenantId
            },
            params: {
                summarizeErrors: 'false'
            },
            data: {
                Invoices: [input]
            },
            retries: 3
        };

        const response = await nango.post(config);
        const providerResponse = ProviderResponseSchema.parse(response.data);
        const invoice = providerResponse.Invoices[0];

        if (!invoice) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No invoice returned in the response.'
            });
        }

        if (invoice.HasErrors) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Xero reported validation errors for the invoice.',
                validation_errors: invoice.ValidationErrors
            });
        }

        return invoice;
    }
});

async function resolveTenantId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();

    if (
        connection &&
        typeof connection === 'object' &&
        'connection_config' in connection &&
        connection.connection_config &&
        typeof connection.connection_config === 'object' &&
        'tenant_id' in connection.connection_config &&
        typeof connection.connection_config['tenant_id'] === 'string' &&
        connection.connection_config['tenant_id'].length > 0
    ) {
        return connection.connection_config['tenant_id'];
    }

    if (
        connection &&
        typeof connection === 'object' &&
        'metadata' in connection &&
        connection.metadata &&
        typeof connection.metadata === 'object' &&
        'tenantId' in connection.metadata &&
        typeof connection.metadata['tenantId'] === 'string' &&
        connection.metadata['tenantId'].length > 0
    ) {
        return connection.metadata['tenantId'];
    }

    const response = await nango.get({
        // https://developer.xero.com/documentation/api/accounting/connections
        endpoint: 'connections',
        retries: 10
    });

    if (!response.data || !Array.isArray(response.data)) {
        throw new nango.ActionError({
            type: 'tenant_resolution_failed',
            message: 'Unexpected response from connections endpoint.'
        });
    }

    if (response.data.length === 1) {
        const tenantId = response.data[0]['tenantId'];
        if (typeof tenantId === 'string') {
            return tenantId;
        }
    }

    if (response.data.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    throw new nango.ActionError({
        type: 'no_tenant',
        message: 'No tenant found for this connection.'
    });
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
