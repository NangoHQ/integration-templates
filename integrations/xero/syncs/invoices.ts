import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const RawInvoiceSchema = z.object({
    InvoiceID: z.string(),
    InvoiceNumber: z.string().optional(),
    Status: z.string().optional(),
    Type: z.string().optional(),
    Contact: z
        .object({
            ContactID: z.string().optional(),
            Name: z.string().optional()
        })
        .optional(),
    Date: z.string().optional(),
    DueDate: z.string().optional(),
    Total: z.number().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    AmountDue: z.number().optional(),
    AmountPaid: z.number().optional(),
    AmountCredited: z.number().optional(),
    UpdatedDateUTC: z.string().optional(),
    CurrencyCode: z.string().optional()
});

const InvoiceSchema = z.object({
    id: z.string(),
    InvoiceNumber: z.string().optional(),
    Status: z.string().optional(),
    Type: z.string().optional(),
    ContactID: z.string().optional(),
    ContactName: z.string().optional(),
    Date: z.string().optional(),
    DueDate: z.string().optional(),
    Total: z.number().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    AmountDue: z.number().optional(),
    AmountPaid: z.number().optional(),
    AmountCredited: z.number().optional(),
    UpdatedDateUTC: z.string().optional(),
    CurrencyCode: z.string().optional()
});

function parseXeroDate(value: string): Date | null {
    const match = value.match(/^\/Date\((\d+)(?:[+-]\d{4})?\)\/$/);
    if (match && match[1]) {
        return new Date(parseInt(match[1], 10));
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function formatIfModifiedSince(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, '');
}

function mapInvoice(raw: unknown): z.infer<typeof InvoiceSchema> | null {
    const parsed = RawInvoiceSchema.safeParse(raw);
    if (!parsed.success) {
        return null;
    }

    const r = parsed.data;
    return {
        id: r.InvoiceID,
        InvoiceNumber: r.InvoiceNumber,
        Status: r.Status,
        Type: r.Type,
        ContactID: r.Contact?.ContactID,
        ContactName: r.Contact?.Name,
        Date: r.Date,
        DueDate: r.DueDate,
        Total: r.Total,
        SubTotal: r.SubTotal,
        TotalTax: r.TotalTax,
        AmountDue: r.AmountDue,
        AmountPaid: r.AmountPaid,
        AmountCredited: r.AmountCredited,
        UpdatedDateUTC: r.UpdatedDateUTC,
        CurrencyCode: r.CurrencyCode
    };
}

const sync = createSync({
    description: 'Sync invoices from Xero.',
    version: '3.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/invoices' }],
    frequency: 'every hour',
    models: {
        Invoice: InvoiceSchema
    },
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        async function resolveTenantId(n: typeof nango): Promise<string> {
            const connection = await n.getConnection();

            if (connection.connection_config !== null && connection.connection_config !== undefined) {
                const val = connection.connection_config['tenant_id'];
                if (typeof val === 'string') {
                    return val;
                }
            }

            if (connection.metadata !== null && connection.metadata !== undefined) {
                const val = connection.metadata['tenantId'];
                if (typeof val === 'string') {
                    return val;
                }
            }

            const connectionsConfig: ProxyConfiguration = {
                // https://developer.xero.com/documentation/api/accounting/connections
                endpoint: 'connections',
                retries: 10
            };
            const connectionsResponse = await n.get<unknown[]>(connectionsConfig);

            const connectionsSchema = z.array(
                z.object({
                    tenantId: z.string()
                })
            );
            const connectionsResult = connectionsSchema.safeParse(connectionsResponse.data);
            if (!connectionsResult.success || connectionsResult.data.length !== 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            const firstConnection = connectionsResult.data[0];
            if (firstConnection === undefined) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            return firstConnection.tenantId;
        }

        const tenantId = await resolveTenantId(nango);
        const checkpoint = await nango.getCheckpoint();

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };
        const params: Record<string, string | number> = {};

        if (checkpoint !== null && checkpoint !== undefined && checkpoint.updated_after.length > 0) {
            headers['If-Modified-Since'] = checkpoint.updated_after;
            params['includeArchived'] = 'true';
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/invoices
            endpoint: 'api.xro/2.0/Invoices',
            headers,
            params,
            retries: 10,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                limit_name_in_request: 'pageSize',
                limit: 100,
                response_path: 'Invoices',
                offset_start_value: 1,
                offset_calculation_method: 'per-page'
            }
        };

        for await (const batch of nango.paginate<unknown>(proxyConfig)) {
            const mapped = batch.map(mapInvoice).filter((item): item is z.infer<typeof InvoiceSchema> => item !== null);

            if (mapped.length === 0) {
                continue;
            }

            const active = mapped.filter((item) => item.Status !== 'DELETED' && item.Status !== 'VOIDED');
            const stale = mapped.filter((item) => item.Status === 'DELETED' || item.Status === 'VOIDED');

            if (active.length > 0) {
                await nango.batchSave(active, 'Invoice');
            }

            if (stale.length > 0) {
                await nango.batchDelete(
                    stale.map((item) => ({ id: item.id })),
                    'Invoice'
                );
            }

            let latestUpdatedDate: Date | null = null;
            for (const item of mapped) {
                if (typeof item.UpdatedDateUTC !== 'string') {
                    continue;
                }

                const parsedUpdatedDate = parseXeroDate(item.UpdatedDateUTC);
                if (parsedUpdatedDate && (!latestUpdatedDate || parsedUpdatedDate > latestUpdatedDate)) {
                    latestUpdatedDate = parsedUpdatedDate;
                }
            }

            if (latestUpdatedDate) {
                await nango.saveCheckpoint({
                    updated_after: formatIfModifiedSince(latestUpdatedDate)
                });
            }
        }
    }
});

export default sync;
