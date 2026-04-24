import { createSync } from 'nango';
import { z } from 'zod';

const ItemSchema = z.object({
    id: z.string(),
    item_code: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    account_code: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const XeroItemSchema = z.object({
    ItemID: z.string(),
    Code: z.string().optional(),
    Name: z.string().optional(),
    Description: z.string().optional(),
    SalesDetails: z
        .object({
            AccountCode: z.string().optional()
        })
        .optional(),
    UpdatedDateUTC: z.string().optional()
});

const XeroItemsResponseSchema = z.object({
    Items: z.array(z.unknown())
});

const XeroConnectionsResponseSchema = z.array(
    z.object({
        tenantId: z.string().optional()
    })
);

type NangoSyncLocal = Parameters<ReturnType<typeof createSync>['exec']>[0];

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

async function resolveTenantId(nango: NangoSyncLocal): Promise<string> {
    const connection = await nango.getConnection();

    const connectionConfig = connection.connection_config;
    if (connectionConfig && typeof connectionConfig === 'object' && 'tenant_id' in connectionConfig) {
        const tenantId = connectionConfig['tenant_id'];
        if (typeof tenantId === 'string') {
            return tenantId;
        }
    }

    const metadata = connection.metadata;
    if (metadata && typeof metadata === 'object' && 'tenantId' in metadata) {
        const tenantId = metadata['tenantId'];
        if (typeof tenantId === 'string') {
            return tenantId;
        }
    }

    // https://developer.xero.com/documentation/api/accounting/connections
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const parsedConnections = XeroConnectionsResponseSchema.safeParse(connectionsResponse.data);
    if (!parsedConnections.success) {
        throw new Error('Unable to parse Xero connections response.');
    }

    if (parsedConnections.data.length === 1 && parsedConnections.data[0]) {
        const tenantId = parsedConnections.data[0].tenantId;
        if (typeof tenantId === 'string') {
            return tenantId;
        }
    }

    throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
}

function mapXeroItem(xeroItem: z.infer<typeof XeroItemSchema>): z.infer<typeof ItemSchema> {
    return {
        id: xeroItem.ItemID,
        ...(xeroItem.Code !== undefined && xeroItem.Code !== null && { item_code: xeroItem.Code }),
        name: xeroItem.Name || xeroItem.Code || '',
        ...(xeroItem.Description !== undefined &&
            xeroItem.Description !== null && {
                description: xeroItem.Description
            }),
        ...(xeroItem.SalesDetails?.AccountCode !== undefined &&
            xeroItem.SalesDetails.AccountCode !== null && {
                account_code: xeroItem.SalesDetails.AccountCode
            })
    };
}

const sync = createSync({
    description: 'Sync inventory and catalog items from Xero.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Item: ItemSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/items'
        }
    ],
    scopes: ['accounting.settings'],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const tenantId = await resolveTenantId(nango);

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (checkpoint && checkpoint.updated_after.length > 0) {
            headers['If-Modified-Since'] = checkpoint.updated_after;
        }

        // https://developer.xero.com/documentation/api/accounting/items
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Items',
            headers: headers,
            retries: 10
        });

        const parsedResponse = XeroItemsResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            await nango.log('Invalid response format from Items endpoint', parsedResponse.error.format());
            return;
        }

        const items = parsedResponse.data.Items;
        const mappedItems: Array<z.infer<typeof ItemSchema>> = [];

        for (const item of items) {
            const parsedItem = XeroItemSchema.safeParse(item);
            if (parsedItem.success) {
                mappedItems.push(mapXeroItem(parsedItem.data));
            }
        }

        if (mappedItems.length > 0) {
            await nango.batchSave(mappedItems, 'Item');
        }

        let latestUpdatedDate: Date | null = null;
        for (const item of items) {
            const parsedItem = XeroItemSchema.safeParse(item);
            if (parsedItem.success && parsedItem.data.UpdatedDateUTC) {
                const parsedUpdatedDate = parseXeroDate(parsedItem.data.UpdatedDateUTC);
                if (parsedUpdatedDate && (!latestUpdatedDate || parsedUpdatedDate > latestUpdatedDate)) {
                    latestUpdatedDate = parsedUpdatedDate;
                }
            }
        }

        if (latestUpdatedDate) {
            await nango.saveCheckpoint({ updated_after: formatIfModifiedSince(latestUpdatedDate) });
        }
    }
});

export type NangoSyncLocal2 = Parameters<(typeof sync)['exec']>[0];
export default sync;
