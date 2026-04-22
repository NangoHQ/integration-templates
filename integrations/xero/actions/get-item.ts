import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The Xero identifier for an Item. Example: 297c2dc5-cc47-4afd-8ec8-74990b8761e9')
});

const PurchaseDetailsSchema = z.object({
    unit_price: z.union([z.number(), z.null()]),
    account_code: z.union([z.string(), z.null()]),
    tax_type: z.union([z.string(), z.null()])
});

const SalesDetailsSchema = z.object({
    unit_price: z.union([z.number(), z.null()]),
    account_code: z.union([z.string(), z.null()]),
    tax_type: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    item_id: z.string(),
    code: z.string(),
    name: z.union([z.string(), z.null()]),
    is_sold: z.boolean(),
    is_purchased: z.boolean(),
    is_tracked_as_inventory: z.boolean(),
    inventory_asset_account_code: z.union([z.string(), z.null()]),
    total_cost_pool: z.union([z.number(), z.null()]),
    quantity_on_hand: z.union([z.number(), z.null()]),
    updated_date_utc: z.string(),
    purchase_details: z.union([PurchaseDetailsSchema, z.null()]),
    sales_details: z.union([SalesDetailsSchema, z.null()])
});

const ConnectionConfigSchema = z.object({
    tenant_id: z.string().optional()
});

const MetadataSchema = z.object({
    tenantId: z.string().optional()
});

const ConnectionSchema = z.object({
    tenantId: z.string()
});

const ConnectionsResponseSchema = z.object({
    data: z.array(z.unknown())
});

const PurchaseDetailsDataSchema = z.object({
    UnitPrice: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional()
});

const SalesDetailsDataSchema = z.object({
    UnitPrice: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional()
});

const ItemDataSchema = z.object({
    ItemID: z.string().optional(),
    Code: z.string().optional(),
    Name: z.string().optional(),
    IsSold: z.boolean().optional(),
    IsPurchased: z.boolean().optional(),
    IsTrackedAsInventory: z.boolean().optional(),
    InventoryAssetAccountCode: z.string().optional(),
    TotalCostPool: z.number().optional(),
    QuantityOnHand: z.number().optional(),
    UpdatedDateUTC: z.string().optional(),
    PurchaseDetails: z.unknown().optional(),
    SalesDetails: z.unknown().optional()
});

const ItemsResponseSchema = z.object({
    Items: z.array(z.unknown())
});

const action = createAction({
    description: 'Retrieve an item by ItemID',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        if (connection.connection_config && typeof connection.connection_config === 'object') {
            const configParse = ConnectionConfigSchema.safeParse(connection.connection_config);
            if (configParse.success && configParse.data.tenant_id) {
                tenantId = configParse.data.tenant_id;
            }
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object') {
            const metaParse = MetadataSchema.safeParse(connection.metadata);
            if (metaParse.success && metaParse.data.tenantId) {
                tenantId = metaParse.data.tenantId;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsParse = ConnectionsResponseSchema.safeParse(connectionsResponse.data);
            if (connectionsParse.success) {
                const connections = connectionsParse.data.data;
                if (connections.length === 1) {
                    const connParse = ConnectionSchema.safeParse(connections[0]);
                    if (connParse.success) {
                        tenantId = connParse.data.tenantId;
                    }
                } else if (connections.length > 1) {
                    throw new nango.ActionError({
                        type: 'multiple_tenants',
                        message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                    });
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id. Please configure tenant_id in connection_config or use get-tenants action.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/items
        const response = await nango.get({
            endpoint: `api.xro/2.0/Items/${input.item_id}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const responseParse = ItemsResponseSchema.safeParse(response.data);
        if (!responseParse.success || responseParse.data.Items.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Item with ID ${input.item_id} not found`,
                item_id: input.item_id
            });
        }

        const itemParse = ItemDataSchema.safeParse(responseParse.data.Items[0]);
        if (!itemParse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid item data received from Xero API'
            });
        }

        const item = itemParse.data;

        let purchaseDetails: z.infer<typeof PurchaseDetailsSchema> | null = null;
        if (item.PurchaseDetails && typeof item.PurchaseDetails === 'object') {
            const pdParse = PurchaseDetailsDataSchema.safeParse(item.PurchaseDetails);
            if (pdParse.success) {
                purchaseDetails = {
                    unit_price: pdParse.data.UnitPrice ?? null,
                    account_code: pdParse.data.AccountCode ?? null,
                    tax_type: pdParse.data.TaxType ?? null
                };
            }
        }

        let salesDetails: z.infer<typeof SalesDetailsSchema> | null = null;
        if (item.SalesDetails && typeof item.SalesDetails === 'object') {
            const sdParse = SalesDetailsDataSchema.safeParse(item.SalesDetails);
            if (sdParse.success) {
                salesDetails = {
                    unit_price: sdParse.data.UnitPrice ?? null,
                    account_code: sdParse.data.AccountCode ?? null,
                    tax_type: sdParse.data.TaxType ?? null
                };
            }
        }

        return {
            item_id: item.ItemID ?? '',
            code: item.Code ?? '',
            name: item.Name ?? null,
            is_sold: item.IsSold ?? false,
            is_purchased: item.IsPurchased ?? false,
            is_tracked_as_inventory: item.IsTrackedAsInventory ?? false,
            inventory_asset_account_code: item.InventoryAssetAccountCode ?? null,
            total_cost_pool: item.TotalCostPool ?? null,
            quantity_on_hand: item.QuantityOnHand ?? null,
            updated_date_utc: item.UpdatedDateUTC ?? '',
            purchase_details: purchaseDetails,
            sales_details: salesDetails
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
