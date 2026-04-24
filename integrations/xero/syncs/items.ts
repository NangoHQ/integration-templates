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

const ConnectionsResponseSchema = z.array(z.object({ tenantId: z.string() }));

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
        const checkpoint = await nango.getCheckpoint();

        const connectionResult = await nango.getConnection();
        const connectionParsed = ConnectionSchema.safeParse(connectionResult);
        const connection = connectionParsed.success ? connectionParsed.data : {};

        let tenantId = connection.connection_config?.['tenant_id'];
        if (!tenantId && connection.metadata?.['tenantId']) {
            tenantId = connection.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({ endpoint: 'connections', retries: 10 });
            const connectionsParsed = ConnectionsResponseSchema.safeParse(connectionsResponse.data);
            if (!connectionsParsed.success) throw new Error('Invalid connections response');

            const connectionsData = connectionsParsed.data;
            if (!connectionsData || connectionsData.length === 0) throw new Error('No Xero tenants found for this connection');
            if (connectionsData.length > 1)
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');

            tenantId = connectionsData[0]?.tenantId;
        }

        if (!tenantId || typeof tenantId !== 'string') {
            throw new Error('Unable to resolve xero-tenant-id');
        }

        const headers: Record<string, string> = { 'xero-tenant-id': tenantId };

        if (checkpoint && checkpoint.updatedAfter.length > 0) {
            headers['If-Modified-Since'] = checkpoint.updatedAfter;
        }

        // https://developer.xero.com/documentation/api/accounting/items
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Items',
            headers,
            retries: 10
        });

        const itemsArray = ItemsResponseSchema.parse(response.data).Items;
        let latestUpdatedAt = checkpoint?.updatedAfter ?? '';

        const items = itemsArray
            .map((rawItem: unknown) => {
                const parsed = XeroItemSchema.safeParse(rawItem);
                if (!parsed.success) return null;

                const item = parsed.data;

                // UpdatedDateUTC comes in format "/Date(1488338552390+0000)/"
                let updatedAt = item.UpdatedDateUTC ?? '';
                if (updatedAt.startsWith('/Date(') && updatedAt.endsWith(')/')) {
                    const timestamp = parseInt(updatedAt.slice(6, -2).replace(/[+-]\d{4}/, ''), 10);
                    if (!isNaN(timestamp)) updatedAt = new Date(timestamp).toISOString();
                }

                if (updatedAt && updatedAt > latestUpdatedAt) latestUpdatedAt = updatedAt;

                return {
                    id: item.ItemID,
                    code: item.Code ?? '',
                    name: item.Name ?? '',
                    description: item.Description ?? '',
                    isTracked: item.IsTrackedAsInventory ?? false,
                    quantityOnHand: item.QuantityOnHand ?? 0,
                    averageCost: item.AverageCost ?? 0,
                    isSold: item.IsSold ?? false,
                    isPurchased: item.IsPurchased ?? false,
                    salesDetails: item.SalesDetails ? JSON.stringify(item.SalesDetails) : '',
                    purchaseDetails: item.PurchaseDetails ? JSON.stringify(item.PurchaseDetails) : '',
                    updatedAt
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        await nango.batchSave(items, 'Item');

        if (latestUpdatedAt !== (checkpoint?.updatedAfter ?? '')) {
            await nango.saveCheckpoint({ updatedAfter: latestUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
