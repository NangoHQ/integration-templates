import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().describe('The Xero ItemID to retrieve. Example: "8fecd03b-d211-491a-a3bb-7203920abac7"')
});

const ProviderPurchaseDetailsSchema = z
    .object({
        UnitPrice: z.number().optional(),
        AccountCode: z.string().optional(),
        COGSAccountCode: z.string().optional(),
        TaxType: z.string().optional()
    })
    .passthrough();

const ProviderSalesDetailsSchema = z
    .object({
        UnitPrice: z.number().optional(),
        AccountCode: z.string().optional(),
        TaxType: z.string().optional()
    })
    .passthrough();

const ProviderItemSchema = z
    .object({
        ItemID: z.string(),
        Code: z.string().optional(),
        Name: z.string().optional(),
        IsSold: z.boolean().optional(),
        IsPurchased: z.boolean().optional(),
        Description: z.string().optional(),
        PurchaseDescription: z.string().optional(),
        InventoryAssetAccountCode: z.string().optional(),
        TotalCostPool: z.number().optional(),
        QuantityOnHand: z.number().optional(),
        IsTrackedAsInventory: z.boolean().optional(),
        UpdatedDateUTC: z.string().optional(),
        PurchaseDetails: ProviderPurchaseDetailsSchema.optional(),
        SalesDetails: ProviderSalesDetailsSchema.optional()
    })
    .passthrough();

const ProviderItemsResponseSchema = z.object({
    Items: z.array(ProviderItemSchema).optional()
});

const OutputSchema = z.object({
    ItemID: z.string(),
    Code: z.string().optional(),
    Name: z.string().optional(),
    IsSold: z.boolean().optional(),
    IsPurchased: z.boolean().optional(),
    Description: z.string().optional(),
    PurchaseDescription: z.string().optional(),
    InventoryAssetAccountCode: z.string().optional(),
    TotalCostPool: z.number().optional(),
    QuantityOnHand: z.number().optional(),
    IsTrackedAsInventory: z.boolean().optional(),
    UpdatedDateUTC: z.string().optional(),
    PurchaseDetails: ProviderPurchaseDetailsSchema.optional(),
    SalesDetails: ProviderSalesDetailsSchema.optional()
});

const action = createAction({
    description: 'Retrieve an item by ItemID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings.read'],

    exec: async (nango, input) => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        if (connection.connection_config && typeof connection.connection_config === 'object') {
            const configTenantId = connection.connection_config['tenant_id'];
            if (typeof configTenantId === 'string' && configTenantId.length > 0) {
                tenantId = configTenantId;
            }
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object') {
            const metaTenantId = connection.metadata['tenantId'];
            if (typeof metaTenantId === 'string' && metaTenantId.length > 0) {
                tenantId = metaTenantId;
            }
        }

        if (!tenantId) {
            const response = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/overview
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = response.data;
            if (!Array.isArray(connectionsData)) {
                throw new Error('Unexpected response from connections endpoint');
            }

            if (connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConn = connectionsData[0];
            if (!firstConn || typeof firstConn !== 'object') {
                throw new Error('Unexpected connection record from connections endpoint');
            }

            const resolvedTenantId = 'tenantId' in firstConn ? firstConn.tenantId : undefined;
            if (typeof resolvedTenantId !== 'string') {
                throw new Error('Unexpected tenantId type from connections endpoint');
            }

            tenantId = resolvedTenantId;
        }

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/items
            endpoint: `api.xro/2.0/Items/${input.itemId}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsed = ProviderItemsResponseSchema.parse(response.data);
        const items = parsed.Items;

        if (!items || items.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Item with ID ${input.itemId} not found.`
            });
        }

        const item = items[0];
        if (item === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Item with ID ${input.itemId} not found.`
            });
        }

        return {
            ItemID: item.ItemID,
            ...(item.Code !== undefined && { Code: item.Code }),
            ...(item.Name !== undefined && { Name: item.Name }),
            ...(item.IsSold !== undefined && { IsSold: item.IsSold }),
            ...(item.IsPurchased !== undefined && { IsPurchased: item.IsPurchased }),
            ...(item.Description !== undefined && { Description: item.Description }),
            ...(item.PurchaseDescription !== undefined && { PurchaseDescription: item.PurchaseDescription }),
            ...(item.InventoryAssetAccountCode !== undefined && { InventoryAssetAccountCode: item.InventoryAssetAccountCode }),
            ...(item.TotalCostPool !== undefined && { TotalCostPool: item.TotalCostPool }),
            ...(item.QuantityOnHand !== undefined && { QuantityOnHand: item.QuantityOnHand }),
            ...(item.IsTrackedAsInventory !== undefined && { IsTrackedAsInventory: item.IsTrackedAsInventory }),
            ...(item.UpdatedDateUTC !== undefined && { UpdatedDateUTC: item.UpdatedDateUTC }),
            ...(item.PurchaseDetails !== undefined && { PurchaseDetails: item.PurchaseDetails }),
            ...(item.SalesDetails !== undefined && { SalesDetails: item.SalesDetails })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
