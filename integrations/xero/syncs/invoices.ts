import { createSync } from 'nango';
import { z } from 'zod';

// https://developer.xero.com/documentation/api/accounting/invoices
const InvoiceSchema = z.object({
    id: z.string(),
    invoiceNumber: z.string().nullable(),
    type: z.string().nullable(),
    status: z.string().nullable(),
    date: z.string().nullable(),
    dueDate: z.string().nullable(),
    total: z.number().nullable(),
    subTotal: z.number().nullable(),
    totalTax: z.number().nullable(),
    amountDue: z.number().nullable(),
    amountPaid: z.number().nullable(),
    currencyCode: z.string().nullable(),
    updatedAt: z.string()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

// Zod schema for connections API response
const ConnectionsResponseSchema = z.array(
    z.object({
        tenantId: z.string().optional()
    })
);

async function resolveTenantId(nango: {
    getConnection: () => Promise<{ connection_config?: Record<string, unknown>; metadata?: Record<string, unknown> | null }>;
    get: (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
}): Promise<string> {
    const connection = await nango.getConnection();

    const configTenantId = connection.connection_config?.['tenant_id'];
    if (typeof configTenantId === 'string' && configTenantId) return configTenantId;

    const metaTenantId = connection.metadata?.['tenantId'];
    if (typeof metaTenantId === 'string' && metaTenantId) return metaTenantId;

    // https://developer.xero.com/documentation/api/accounting/overview#get-connections
    const connectionsResponse = await nango.get({ endpoint: 'connections', retries: 10 });
    const parseResult = ConnectionsResponseSchema.safeParse(connectionsResponse.data);
    if (!parseResult.success) throw new Error('Failed to parse connections response');

    const connections = parseResult.data;
    if (connections.length > 1) throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');

    const tenantId = connections[0]?.tenantId;
    if (tenantId) return tenantId;

    throw new Error('No tenant ID found. Please configure tenant_id in connection_config or tenantId in metadata.');
}

const sync = createSync({
    description: 'Sync invoices from Xero',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Invoice: InvoiceSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/invoices' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const tenantId = await resolveTenantId(nango);

        const isIncremental = checkpoint && checkpoint.updatedAfter.length > 0;

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (isIncremental) {
            headers['If-Modified-Since'] = new Date(checkpoint.updatedAfter).toISOString().slice(0, 19);
        }

        const XeroInvoiceSchema = z.object({
            InvoiceID: z.string().optional(),
            InvoiceNumber: z.string().optional(),
            Type: z.string().optional(),
            Status: z.string().optional(),
            Date: z.string().optional(),
            DueDate: z.string().optional(),
            Total: z.number().optional(),
            SubTotal: z.number().optional(),
            TotalTax: z.number().optional(),
            AmountDue: z.number().optional(),
            AmountPaid: z.number().optional(),
            CurrencyCode: z.string().optional(),
            UpdatedDateUTC: z.string().optional()
        });

        let page = 1;
        let hasMorePages = true;
        let latestUpdatedDateUTC = checkpoint?.updatedAfter ?? '';

        while (hasMorePages) {
            // https://developer.xero.com/documentation/api/accounting/invoices
            const response = await nango.get({
                endpoint: 'api.xro/2.0/Invoices',
                headers,
                params: {
                    page: page.toString(),
                    includeArchived: isIncremental ? 'true' : 'false'
                },
                retries: 10
            });

            const invoices = z.object({ Invoices: z.array(XeroInvoiceSchema).optional() }).parse(response.data).Invoices ?? [];

            if (invoices.length === 0) {
                hasMorePages = false;
                break;
            }

            const mapped = invoices
                .filter((inv) => inv.InvoiceID)
                .map((inv) => {
                    const updatedAt = inv.UpdatedDateUTC ?? '';
                    if (updatedAt && updatedAt > latestUpdatedDateUTC) latestUpdatedDateUTC = updatedAt;
                    return {
                        id: inv.InvoiceID!,
                        invoiceNumber: inv.InvoiceNumber ?? null,
                        type: inv.Type ?? null,
                        status: inv.Status ?? null,
                        date: inv.Date ?? null,
                        dueDate: inv.DueDate ?? null,
                        total: inv.Total ?? null,
                        subTotal: inv.SubTotal ?? null,
                        totalTax: inv.TotalTax ?? null,
                        amountDue: inv.AmountDue ?? null,
                        amountPaid: inv.AmountPaid ?? null,
                        currencyCode: inv.CurrencyCode ?? null,
                        updatedAt
                    };
                });

            const activeInvoices = mapped.filter((inv) => inv.status !== 'DELETED' && inv.status !== 'VOIDED');
            await nango.batchSave(activeInvoices, 'Invoice');

            if (isIncremental) {
                const deletedInvoices = mapped.filter((inv) => inv.status === 'DELETED' || inv.status === 'VOIDED');
                await nango.batchDelete(deletedInvoices, 'Invoice');
            }

            if (invoices.length < 100) {
                hasMorePages = false;
            } else {
                page += 1;
            }
        }

        if (latestUpdatedDateUTC !== (checkpoint?.updatedAfter ?? '')) {
            await nango.saveCheckpoint({ updatedAfter: latestUpdatedDateUTC });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
