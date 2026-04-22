import { createSync } from 'nango';
import { z } from 'zod';

// https://developer.xero.com/documentation/api/accounting/invoices
const InvoiceSchema = z.object({
    id: z.string(),
    invoice_number: z.string().nullable(),
    type: z.string().nullable(),
    status: z.string().nullable(),
    date: z.string().nullable(),
    due_date: z.string().nullable(),
    total: z.number().nullable(),
    sub_total: z.number().nullable(),
    total_tax: z.number().nullable(),
    amount_due: z.number().nullable(),
    amount_paid: z.number().nullable(),
    currency_code: z.string().nullable(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

// Zod schema for connections API response
const ConnectionsResponseSchema = z.object({
    data: z
        .array(
            z.object({
                tenantId: z.string().optional()
            })
        )
        .optional()
});

// Helper function to resolve tenant ID from connection
async function resolveTenantId(nango: {
    getConnection: () => Promise<unknown>;
    get: (config: { endpoint: string; headers?: Record<string, string>; params?: Record<string, string>; retries: number }) => Promise<{ data: unknown }>;
}): Promise<string> {
    const rawConnection = await nango.getConnection();

    if (rawConnection === null || typeof rawConnection !== 'object' || Array.isArray(rawConnection)) {
        throw new Error('Invalid connection data');
    }

    // Helper to check if value is a record object
    const isRecord = (val: unknown): val is Record<string, unknown> => {
        return val !== null && typeof val === 'object' && !Array.isArray(val);
    };

    // Helper to get string property from record
    const getStringProp = (obj: Record<string, unknown>, key: string): string | undefined => {
        const val = obj[key];
        return typeof val === 'string' && val ? val : undefined;
    };

    // Type guard to check and convert to record
    const toRecord = (obj: unknown): Record<string, unknown> | undefined => {
        return isRecord(obj) ? obj : undefined;
    };

    const connectionRecord = toRecord(rawConnection);

    // Priority 1: connection_config['tenant_id']
    const connectionConfig = connectionRecord ? connectionRecord['connection_config'] : undefined;
    const configRecord = toRecord(connectionConfig);
    if (configRecord) {
        const tenantId = getStringProp(configRecord, 'tenant_id');
        if (tenantId) {
            return tenantId;
        }
    }

    // Priority 2: metadata['tenantId']
    const metadata = connectionRecord ? connectionRecord['metadata'] : undefined;
    const metaRecord = toRecord(metadata);
    if (metaRecord) {
        const tenantId = getStringProp(metaRecord, 'tenantId');
        if (tenantId) {
            return tenantId;
        }
    }

    // Priority 3: Call GET connections API
    // https://developer.xero.com/documentation/api/accounting/overview#get-connections
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const parseResult = ConnectionsResponseSchema.safeParse(connectionsResponse.data);
    if (!parseResult.success) {
        throw new Error('Failed to parse connections response');
    }

    const connections = parseResult.data.data ?? [];

    const firstConnection = connections[0];
    if (connections.length === 1 && firstConnection && firstConnection.tenantId) {
        return firstConnection.tenantId;
    }

    if (connections.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    throw new Error('No tenant ID found. Please configure tenant_id in connection_config or tenantId in metadata.');
}

const sync = createSync({
    description: 'Sync invoices from Xero',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Invoice: InvoiceSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/sync-invoices' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const tenantId = await resolveTenantId(nango);

        // Build headers with If-Modified-Since when we have a checkpoint
        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (checkpoint && checkpoint.updated_after) {
            headers['If-Modified-Since'] = checkpoint.updated_after;
        }

        let page = 1;
        let hasMorePages = true;

        while (hasMorePages) {
            // https://developer.xero.com/documentation/api/accounting/invoices
            const response = await nango.get({
                endpoint: 'api.xro/2.0/Invoices',
                headers,
                params: {
                    page: page.toString()
                },
                retries: 3
            });

            const parseResult = z
                .object({
                    Invoices: z
                        .array(
                            z.object({
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
                            })
                        )
                        .optional()
                })
                .safeParse(response.data);

            if (!parseResult.success) {
                throw new Error('Failed to parse invoices response');
            }

            const invoices = parseResult.data.Invoices ?? [];

            if (invoices.length === 0) {
                hasMorePages = false;
                break;
            }

            const upserts: Array<{
                id: string;
                invoice_number: string | null;
                type: string | null;
                status: string | null;
                date: string | null;
                due_date: string | null;
                total: number | null;
                sub_total: number | null;
                total_tax: number | null;
                amount_due: number | null;
                amount_paid: number | null;
                currency_code: string | null;
                updated_at: string;
            }> = [];
            const deletions: Array<{ id: string }> = [];

            for (const invoice of invoices) {
                if (!invoice.InvoiceID) {
                    continue;
                }

                const status = invoice.Status ?? '';

                // Handle deleted or voided invoices
                if (status === 'DELETED' || status === 'VOIDED') {
                    deletions.push({ id: invoice.InvoiceID });
                    continue;
                }

                upserts.push({
                    id: invoice.InvoiceID,
                    invoice_number: invoice.InvoiceNumber ?? null,
                    type: invoice.Type ?? null,
                    status: invoice.Status ?? null,
                    date: invoice.Date ?? null,
                    due_date: invoice.DueDate ?? null,
                    total: invoice.Total ?? null,
                    sub_total: invoice.SubTotal ?? null,
                    total_tax: invoice.TotalTax ?? null,
                    amount_due: invoice.AmountDue ?? null,
                    amount_paid: invoice.AmountPaid ?? null,
                    currency_code: invoice.CurrencyCode ?? null,
                    updated_at: invoice.UpdatedDateUTC ?? new Date().toISOString()
                });
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'Invoice');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'Invoice');
            }

            // Save checkpoint with the last invoice's UpdatedDateUTC
            const lastInvoice = invoices[invoices.length - 1];
            if (lastInvoice?.UpdatedDateUTC) {
                await nango.saveCheckpoint({
                    updated_after: lastInvoice.UpdatedDateUTC
                });
            }

            // Xero returns up to 100 invoices per page
            if (invoices.length < 100) {
                hasMorePages = false;
            } else {
                page += 1;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
