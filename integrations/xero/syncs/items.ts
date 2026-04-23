import { createSync } from 'nango';
import { z } from 'zod';

const ItemSchema = z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    description: z.string(),
    isTracked: z.boolean(),
    quantityOnHand: z.number(),
    averageCost: z.number(),
    isSold: z.boolean(),
    isPurchased: z.boolean(),
    salesDetails: z.string(),
    purchaseDetails: z.string(),
    updatedAt: z.string()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

const XeroItemSchema = z.object({
    ItemID: z.string(),
    Code: z.string().optional(),
    Name: z.string().optional(),
    Description: z.string().optional(),
    IsTrackedAsInventory: z.boolean().optional(),
    QuantityOnHand: z.number().optional(),
    AverageCost: z.number().optional(),
    IsSold: z.boolean().optional(),
    IsPurchased: z.boolean().optional(),
    SalesDetails: z.record(z.string(), z.unknown()).optional(),
    PurchaseDetails: z.record(z.string(), z.unknown()).optional(),
    UpdatedDateUTC: z.string().optional()
});

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const ConnectionsResponseSchema = z.object({
    data: z.array(z.object({ tenantId: z.string() })).optional()
});

const ItemsResponseSchema = z.object({
    Items: z.array(z.unknown())
});

const models = {
    Item: ItemSchema
};

const sync = createSync<typeof models, undefined, typeof CheckpointSchema | undefined>({
    description: 'Sync inventory and catalog items from Xero',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: models,

    endpoints: [
        {
            method: 'GET',
            path: '/syncs/items'
        }
    ],

    exec: async (nango) => {
        const checkpointResult = await nango.getCheckpoint();
        const checkpoint = checkpointResult || null;
        let latestUpdatedAt = checkpoint?.updatedAfter ?? '';

        // Resolve tenant ID: connection_config -> metadata -> connections API
        const connectionResult = await nango.getConnection();
        const connectionParsed = ConnectionSchema.safeParse(connectionResult);
        const connection = connectionParsed.success ? connectionParsed.data : {};

        let tenantId = connection.connection_config?.['tenant_id'];
        if (!tenantId && connection.metadata?.['tenantId']) {
            tenantId = connection.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsParsed = ConnectionsResponseSchema.safeParse(connectionsResponse);
            if (!connectionsParsed.success) {
                throw new Error('Invalid connections response');
            }
            const connectionsData = connectionsParsed.data.data;
            if (!connectionsData || connectionsData.length === 0) {
                throw new Error('No Xero tenants found for this connection');
            }
            if (connectionsData.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }
            tenantId = connectionsData[0]?.tenantId;
        }

        if (!tenantId || typeof tenantId !== 'string') {
            throw new Error('Unable to resolve xero-tenant-id');
        }

        // https://developer.xero.com/documentation/api/accounting/items
        // Xero uses manual pagination with page numbers; Nango's built-in paginate
        // doesn't have a configuration for Xero, so we use a manual loop
        let page = 1;
        const pageSize = 100;

        // Xero API requires manual pagination since Nango's built-in paginate
        // method doesn't have a configuration for Xero
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            const response = await nango.get({
                endpoint: 'api.xro/2.0/Items',
                headers: {
                    'xero-tenant-id': tenantId,
                    ...(checkpoint?.updatedAfter && { 'If-Modified-Since': checkpoint.updatedAfter })
                },
                params: {
                    page: String(page),
                    pageSize: String(pageSize)
                },
                retries: 3
            });

            const itemsData = response.data;
            if (!itemsData || typeof itemsData !== 'object') {
                break;
            }

            let itemsArray: unknown[] = [];
            if (Array.isArray(itemsData)) {
                itemsArray = itemsData;
            } else {
                const parsedResponse = ItemsResponseSchema.safeParse(itemsData);
                if (parsedResponse.success && Array.isArray(parsedResponse.data.Items)) {
                    itemsArray = parsedResponse.data.Items;
                }
            }
            if (itemsArray.length === 0) {
                break;
            }

            let pageLatestUpdatedAt = latestUpdatedAt;

            const items = itemsArray
                .map((rawItem: unknown) => {
                    const parsed = XeroItemSchema.safeParse(rawItem);
                    if (!parsed.success) {
                        return null;
                    }
                    const item = parsed.data;

                    // Parse UpdatedDateUTC which comes in format "/Date(1488338552390+0000)/"
                    let updatedAt = item.UpdatedDateUTC || '';
                    if (updatedAt.startsWith('/Date(') && updatedAt.endsWith(')/')) {
                        const timestampStr = updatedAt.slice(6, -2);
                        const timestamp = parseInt(timestampStr.replace(/[+-]\d{4}/, ''), 10);
                        if (!isNaN(timestamp)) {
                            updatedAt = new Date(timestamp).toISOString();
                        }
                    }

                    if (updatedAt && updatedAt > pageLatestUpdatedAt) {
                        pageLatestUpdatedAt = updatedAt;
                    }

                    return {
                        id: item.ItemID,
                        code: item.Code || '',
                        name: item.Name || '',
                        description: item.Description || '',
                        isTracked: item.IsTrackedAsInventory || false,
                        quantityOnHand: item.QuantityOnHand || 0,
                        averageCost: item.AverageCost || 0,
                        isSold: item.IsSold || false,
                        isPurchased: item.IsPurchased || false,
                        salesDetails: item.SalesDetails ? JSON.stringify(item.SalesDetails) : '',
                        purchaseDetails: item.PurchaseDetails ? JSON.stringify(item.PurchaseDetails) : '',
                        updatedAt: updatedAt
                    };
                })
                .filter((item): item is NonNullable<typeof item> => item !== null);

            if (items.length === 0) {
                break;
            }

            await nango.batchSave(items, 'Item');

            if (pageLatestUpdatedAt !== latestUpdatedAt) {
                latestUpdatedAt = pageLatestUpdatedAt;
                await nango.saveCheckpoint({
                    updatedAfter: latestUpdatedAt
                });
            }

            // If we got fewer items than page size, we've reached the end
            if (itemsArray.length < pageSize) {
                break;
            }

            page += 1;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
