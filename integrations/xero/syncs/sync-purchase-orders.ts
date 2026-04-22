import { createSync } from 'nango';
import { z } from 'zod';

const PurchaseOrderSchema = z.object({
    id: z.string(),
    purchase_order_number: z.union([z.string(), z.null()]),
    contact_id: z.union([z.string(), z.null()]),
    contact_name: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    date: z.union([z.string(), z.null()]),
    delivery_date: z.union([z.string(), z.null()]),
    reference: z.union([z.string(), z.null()]),
    updated_date_utc: z.union([z.string(), z.null()]),
    currency_code: z.union([z.string(), z.null()]),
    total: z.union([z.number(), z.null()]),
    sub_total: z.union([z.number(), z.null()]),
    total_tax: z.union([z.number(), z.null()]),
    line_items: z.union([z.array(z.unknown()), z.null()]),
    attachments: z.union([z.array(z.unknown()), z.null()]),
    url: z.union([z.string(), z.null()]),
    currency_rate: z.union([z.number(), z.null()]),
    sent_to_contact: z.union([z.boolean(), z.null()]),
    delivery_address: z.union([z.string(), z.null()]),
    attention_to: z.union([z.string(), z.null()]),
    telephone: z.union([z.string(), z.null()]),
    delivery_instructions: z.union([z.string(), z.null()]),
    purchase_order_id: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number()
});

const PurchaseOrdersResponseSchema = z.object({
    PurchaseOrders: z.array(z.object({}).passthrough()),
    pagination: z
        .object({
            page: z.number(),
            pageSize: z.number(),
            pageCount: z.number(),
            itemCount: z.number()
        })
        .optional()
});

async function resolveTenantId(nango: {
    getConnection: () => Promise<unknown>;
    get: (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
}): Promise<string> {
    const connectionResponse = await nango.getConnection();

    const connectionSchema = z.object({
        connection_config: z.object({ tenant_id: z.string().optional() }).optional(),
        metadata: z.object({ tenantId: z.string().optional() }).optional()
    });

    const connection = connectionSchema.safeParse(connectionResponse);

    if (connection.success) {
        const tenantId = connection.data.connection_config?.tenant_id || connection.data.metadata?.tenantId;
        if (tenantId) {
            return tenantId;
        }
    }

    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const responseData = connectionsResponse.data;

    if (!Array.isArray(responseData)) {
        throw new Error('Connections response is not an array');
    }

    const connections: Array<{ tenantId: string }> = [];

    for (const item of responseData) {
        if (typeof item === 'object' && item !== null && 'tenantId' in item && typeof item.tenantId === 'string') {
            connections.push({ tenantId: item.tenantId });
        }
    }

    if (connections.length === 0) {
        throw new Error('No Xero tenants found for this connection');
    }

    if (connections.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const first = connections[0];
    if (first === undefined) {
        throw new Error('No Xero tenants found for this connection');
    }

    return first.tenantId;
}

const sync = createSync({
    description: 'Sync purchase orders from Xero',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        PurchaseOrder: PurchaseOrderSchema
    },
    endpoints: [
        {
            path: '/syncs/sync-purchase-orders',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const tenantId = await resolveTenantId(nango);
        const checkpointResponse = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpointResponse);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : null;

        const syncWindowStart = checkpoint?.updated_after ?? '';
        let latestUpdatedAt = syncWindowStart;
        let page = checkpoint?.page ?? 1;

        // @allowTryCatch - This is the main sync loop with pagination
        while (true) {
            const params: Record<string, string> = {
                page: String(page)
            };

            const headers: Record<string, string> = {
                'xero-tenant-id': tenantId
            };

            if (syncWindowStart) {
                headers['If-Modified-Since'] = syncWindowStart;
            }

            // https://developer.xero.com/documentation/api/accounting/purchaseorders
            const response = await nango.get({
                endpoint: 'api.xro/2.0/PurchaseOrders',
                params,
                headers,
                retries: 3
            });

            const parsed = PurchaseOrdersResponseSchema.safeParse(response.data);

            if (!parsed.success) {
                throw new Error(`Failed to parse PurchaseOrders response: ${parsed.error.message}`);
            }

            const rawPurchaseOrders = parsed.data.PurchaseOrders;

            if (rawPurchaseOrders.length === 0) {
                break;
            }

            let pageLatestUpdatedAt = latestUpdatedAt;

            const purchaseOrders = rawPurchaseOrders.map((item) => {
                const contactVal = item['Contact'];
                const contactIsObject = typeof contactVal === 'object' && contactVal !== null;
                const contactName = contactIsObject && 'Name' in contactVal && typeof contactVal['Name'] === 'string' ? contactVal['Name'] : null;
                const updatedDateUtc = typeof item['UpdatedDateUTC'] === 'string' ? item['UpdatedDateUTC'] : null;

                if (updatedDateUtc && updatedDateUtc > pageLatestUpdatedAt) {
                    pageLatestUpdatedAt = updatedDateUtc;
                }

                return {
                    id: typeof item['PurchaseOrderID'] === 'string' ? item['PurchaseOrderID'] : String(item['PurchaseOrderID'] || ''),
                    purchase_order_number: typeof item['PurchaseOrderNumber'] === 'string' ? item['PurchaseOrderNumber'] : null,
                    contact_id: typeof item['ContactID'] === 'string' ? item['ContactID'] : null,
                    contact_name: contactName,
                    status: typeof item['Status'] === 'string' ? item['Status'] : null,
                    date: typeof item['Date'] === 'string' ? item['Date'] : null,
                    delivery_date: typeof item['DeliveryDate'] === 'string' ? item['DeliveryDate'] : null,
                    reference: typeof item['Reference'] === 'string' ? item['Reference'] : null,
                    updated_date_utc: updatedDateUtc,
                    currency_code: typeof item['CurrencyCode'] === 'string' ? item['CurrencyCode'] : null,
                    total: typeof item['Total'] === 'number' ? item['Total'] : null,
                    sub_total: typeof item['SubTotal'] === 'number' ? item['SubTotal'] : null,
                    total_tax: typeof item['TotalTax'] === 'number' ? item['TotalTax'] : null,
                    line_items: Array.isArray(item['LineItems']) ? item['LineItems'] : null,
                    attachments: Array.isArray(item['Attachments']) ? item['Attachments'] : null,
                    url: typeof item['URL'] === 'string' ? item['URL'] : null,
                    currency_rate: typeof item['CurrencyRate'] === 'number' ? item['CurrencyRate'] : null,
                    sent_to_contact: typeof item['SentToContact'] === 'boolean' ? item['SentToContact'] : null,
                    delivery_address: typeof item['DeliveryAddress'] === 'string' ? item['DeliveryAddress'] : null,
                    attention_to: typeof item['AttentionTo'] === 'string' ? item['AttentionTo'] : null,
                    telephone: typeof item['Telephone'] === 'string' ? item['Telephone'] : null,
                    delivery_instructions: typeof item['DeliveryInstructions'] === 'string' ? item['DeliveryInstructions'] : null,
                    purchase_order_id: typeof item['PurchaseOrderID'] === 'string' ? item['PurchaseOrderID'] : null
                };
            });

            await nango.batchSave(purchaseOrders, 'PurchaseOrder');

            const pagination = parsed.data.pagination;
            const hasMorePages = pagination && page < pagination.pageCount;

            if (hasMorePages) {
                page += 1;
                await nango.saveCheckpoint({
                    updated_after: syncWindowStart,
                    page
                });
                continue;
            }

            latestUpdatedAt = pageLatestUpdatedAt;

            await nango.saveCheckpoint({
                updated_after: latestUpdatedAt,
                page: 1
            });
            break;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
