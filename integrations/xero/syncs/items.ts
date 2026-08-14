import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderPurchaseDetailsSchema = z.object({
    UnitPrice: z.number().optional().nullable(),
    AccountCode: z.string().optional().nullable(),
    TaxType: z.string().optional().nullable(),
    COGSAccountCode: z.string().optional().nullable()
});

const ProviderSalesDetailsSchema = z.object({
    UnitPrice: z.number().optional().nullable(),
    AccountCode: z.string().optional().nullable(),
    TaxType: z.string().optional().nullable()
});

const ProviderItemSchema = z.object({
    ItemID: z.string(),
    Code: z.string(),
    Name: z.string().optional().nullable(),
    Description: z.string().optional().nullable(),
    PurchaseDescription: z.string().optional().nullable(),
    IsSold: z.boolean().optional().nullable(),
    IsPurchased: z.boolean().optional().nullable(),
    IsTrackedAsInventory: z.boolean().optional().nullable(),
    InventoryAssetAccountCode: z.string().optional().nullable(),
    TotalCostPool: z.number().optional().nullable(),
    QuantityOnHand: z.number().optional().nullable(),
    QuantityOnBackOrder: z.number().optional().nullable(),
    UpdatedDateUTC: z.string(),
    PurchaseDetails: ProviderPurchaseDetailsSchema.optional().nullable(),
    SalesDetails: ProviderSalesDetailsSchema.optional().nullable()
});

const ItemSchema = z
    .object({
        id: z.string().describe('Xero generated unique identifier for the item'),
        code: z.string().describe('User defined item code'),
        name: z.string().optional().describe('The name of the item'),
        description: z.string().optional().describe('The sales description of the item'),
        purchaseDescription: z.string().optional().describe('The purchase description of the item'),
        isSold: z.boolean().optional().describe('Whether the item is available on sales transactions in the Xero UI'),
        isPurchased: z.boolean().optional().describe('Whether the item is available for purchase transactions in the Xero UI'),
        isTrackedAsInventory: z.boolean().optional().describe('True for items tracked as inventory with quantity on hand'),
        inventoryAssetAccountCode: z.string().optional().describe('The inventory asset account code for tracked items'),
        totalCostPool: z.number().optional().describe('The value of the item on hand calculated using average cost accounting'),
        quantityOnHand: z.number().optional().describe('The quantity of the item on hand'),
        quantityOnBackOrder: z.number().optional().describe('The quantity of the item on backorder'),
        updatedDateUTC: z.string().describe('The date and time when the item was last updated in UTC'),
        purchaseDetails: z
            .object({
                unitPrice: z.number().optional().describe('Unit price for purchase transactions'),
                accountCode: z.string().optional().describe('Account code for purchase transactions'),
                taxType: z.string().optional().describe('Tax type for purchase transactions'),
                cogsAccountCode: z.string().optional().describe('COGS account code for tracked inventory items')
            })
            .optional()
            .describe('Purchase details for the item'),
        salesDetails: z
            .object({
                unitPrice: z.number().optional().describe('Unit price for sales transactions'),
                accountCode: z.string().optional().describe('Account code for sales transactions'),
                taxType: z.string().optional().describe('Tax type for sales transactions')
            })
            .optional()
            .describe('Sales details for the item')
    })
    .describe('Inventory and catalog item from Xero');

function parseXeroDate(value: string): Date | null {
    // Allow negative timestamps for pre-1970 Xero dates (see general-ledger.ts parseDate).
    const match = value.match(/^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/);
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

async function resolveTenantId(nango: Parameters<(typeof sync)['exec']>[0]): Promise<string> {
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

    // https://developer.xero.com/documentation/api/accounting/overview
    const response = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    if (!Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('No Xero tenants found for this connection.');
    }

    if (response.data.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const parsedConnections = z
        .array(
            z.object({
                tenantId: z.string()
            })
        )
        .safeParse(response.data);

    if (parsedConnections.success) {
        const first = parsedConnections.data[0];
        if (first && first.tenantId.length > 0) {
            return first.tenantId;
        }
    }

    throw new Error('Unable to resolve xero-tenant-id.');
}

const sync = createSync({
    description: 'Sync inventory and catalog items from Xero.',
    version: '3.1.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Item: ItemSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const tenantId = await resolveTenantId(nango);
        const isFullRefresh = !checkpoint || checkpoint.updated_after.length === 0;

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (checkpoint && checkpoint.updated_after.length > 0) {
            headers['If-Modified-Since'] = checkpoint.updated_after;
        }

        // https://developer.xero.com/documentation/api/accounting/items
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Items',
            headers,
            retries: 3
        });

        const parsedBody = z
            .object({
                Items: z.array(ProviderItemSchema)
            })
            .safeParse(response.data);

        if (!parsedBody.success) {
            throw new Error(`Failed to parse items response: ${parsedBody.error.message}`);
        }

        if (isFullRefresh) {
            await nango.trackDeletesStart('Item');
        }

        const items = parsedBody.data.Items.map((item) => {
            return {
                id: item.ItemID,
                code: item.Code,
                ...(item.Name != null && { name: item.Name }),
                ...(item.Description != null && { description: item.Description }),
                ...(item.PurchaseDescription != null && { purchaseDescription: item.PurchaseDescription }),
                ...(item.IsSold != null && { isSold: item.IsSold }),
                ...(item.IsPurchased != null && { isPurchased: item.IsPurchased }),
                ...(item.IsTrackedAsInventory != null && { isTrackedAsInventory: item.IsTrackedAsInventory }),
                ...(item.InventoryAssetAccountCode != null && { inventoryAssetAccountCode: item.InventoryAssetAccountCode }),
                ...(item.TotalCostPool != null && { totalCostPool: item.TotalCostPool }),
                ...(item.QuantityOnHand != null && { quantityOnHand: item.QuantityOnHand }),
                ...(item.QuantityOnBackOrder != null && { quantityOnBackOrder: item.QuantityOnBackOrder }),
                updatedDateUTC: item.UpdatedDateUTC,
                ...(item.PurchaseDetails != null && {
                    purchaseDetails: {
                        ...(item.PurchaseDetails.UnitPrice != null && { unitPrice: item.PurchaseDetails.UnitPrice }),
                        ...(item.PurchaseDetails.AccountCode != null && { accountCode: item.PurchaseDetails.AccountCode }),
                        ...(item.PurchaseDetails.TaxType != null && { taxType: item.PurchaseDetails.TaxType }),
                        ...(item.PurchaseDetails.COGSAccountCode != null && { cogsAccountCode: item.PurchaseDetails.COGSAccountCode })
                    }
                }),
                ...(item.SalesDetails != null && {
                    salesDetails: {
                        ...(item.SalesDetails.UnitPrice != null && { unitPrice: item.SalesDetails.UnitPrice }),
                        ...(item.SalesDetails.AccountCode != null && { accountCode: item.SalesDetails.AccountCode }),
                        ...(item.SalesDetails.TaxType != null && { taxType: item.SalesDetails.TaxType })
                    }
                })
            };
        });

        if (items.length > 0) {
            await nango.batchSave(items, 'Item');

            let latestUpdatedDate: Date | null = null;
            for (const item of items) {
                const parsedDate = parseXeroDate(item.updatedDateUTC);
                if (parsedDate && (!latestUpdatedDate || parsedDate > latestUpdatedDate)) {
                    latestUpdatedDate = parsedDate;
                }
            }

            if (latestUpdatedDate) {
                await nango.saveCheckpoint({
                    updated_after: formatIfModifiedSince(latestUpdatedDate)
                });
            }
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('Item');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
