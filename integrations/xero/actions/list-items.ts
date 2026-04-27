import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    where: z.string().optional().describe('Filter expression. Example: Status=="ACTIVE"'),
    order: z.string().optional().describe('Order by expression. Example: Name ASC'),
    page: z.number().optional().describe('Page number for pagination. Defaults to 1.'),
    modified_since: z.string().optional().describe('If-Modified-Since header value in UTC format.')
});

const PurchaseDetailsSchema = z
    .object({
        UnitPrice: z.number().optional(),
        AccountCode: z.string().optional(),
        COGSAccountCode: z.string().optional(),
        TaxType: z.string().optional()
    })
    .passthrough();

const SalesDetailsSchema = z
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
        PurchaseDetails: PurchaseDetailsSchema.optional(),
        SalesDetails: SalesDetailsSchema.optional(),
        IsTrackedAsInventory: z.boolean().optional(),
        InventoryAssetAccountCode: z.string().optional(),
        TotalCostPool: z.number().optional(),
        QuantityOnHand: z.number().optional(),
        UpdatedDateUTC: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    Items: z.array(ProviderItemSchema)
});

const OutputItemSchema = z.object({
    item_id: z.string(),
    code: z.string().optional(),
    name: z.string().optional(),
    is_sold: z.boolean().optional(),
    is_purchased: z.boolean().optional(),
    description: z.string().optional(),
    purchase_description: z.string().optional(),
    purchase_details: z
        .object({
            unit_price: z.number().optional(),
            account_code: z.string().optional(),
            cogs_account_code: z.string().optional(),
            tax_type: z.string().optional()
        })
        .optional(),
    sales_details: z
        .object({
            unit_price: z.number().optional(),
            account_code: z.string().optional(),
            tax_type: z.string().optional()
        })
        .optional(),
    is_tracked_as_inventory: z.boolean().optional(),
    inventory_asset_account_code: z.string().optional(),
    total_cost_pool: z.number().optional(),
    quantity_on_hand: z.number().optional(),
    updated_date_utc: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List items with optional filtering.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-items',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;
        const connectionSchema = z.object({
            connection_config: z.record(z.string(), z.unknown()).optional(),
            metadata: z.record(z.string(), z.unknown()).optional()
        });
        const parsedConnection = connectionSchema.safeParse(connection);
        if (parsedConnection.success) {
            const cfg = parsedConnection.data.connection_config;
            if (cfg && typeof cfg['tenant_id'] === 'string') {
                tenantId = cfg['tenant_id'];
            }
            if (!tenantId) {
                const meta = parsedConnection.data.metadata;
                if (meta && typeof meta['tenantId'] === 'string') {
                    tenantId = meta['tenantId'];
                }
            }
        }
        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/tenants
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const ConnectionsSchema = z.union([
                z.array(z.object({ tenantId: z.string() }).passthrough()),
                z.object({
                    data: z.array(z.object({ tenantId: z.string() }).passthrough())
                })
            ]);

            const connectionsData = ConnectionsSchema.parse(connectionsResponse.data);
            const connections = Array.isArray(connectionsData) ? connectionsData : connectionsData.data;

            if (connections.length === 1) {
                const first = connections[0];
                if (first) {
                    tenantId = first.tenantId;
                }
            } else if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            } else {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No tenant found for this connection.'
                });
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'no_tenant',
                message: 'Could not resolve xero-tenant-id.'
            });
        }

        const params: Record<string, string> = {};
        if (input.where !== undefined) {
            params['where'] = input.where;
        }
        if (input.order !== undefined) {
            params['order'] = input.order;
        }
        if (input.page !== undefined) {
            params['page'] = String(input.page);
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };
        if (input.modified_since !== undefined) {
            headers['If-Modified-Since'] = input.modified_since;
        }

        // https://developer.xero.com/documentation/api/accounting/items
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Items',
            params: params,
            headers: headers,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const items = providerData.Items.map((item) => {
            const mapped: z.infer<typeof OutputItemSchema> = {
                item_id: item.ItemID
            };
            if (item.Code !== undefined) {
                mapped.code = item.Code;
            }
            if (item.Name !== undefined) {
                mapped.name = item.Name;
            }
            if (item.IsSold !== undefined) {
                mapped.is_sold = item.IsSold;
            }
            if (item.IsPurchased !== undefined) {
                mapped.is_purchased = item.IsPurchased;
            }
            if (item.Description !== undefined) {
                mapped.description = item.Description;
            }
            if (item.PurchaseDescription !== undefined) {
                mapped.purchase_description = item.PurchaseDescription;
            }
            if (item.PurchaseDetails !== undefined) {
                mapped.purchase_details = {
                    ...(item.PurchaseDetails.UnitPrice !== undefined && { unit_price: item.PurchaseDetails.UnitPrice }),
                    ...(item.PurchaseDetails.AccountCode !== undefined && { account_code: item.PurchaseDetails.AccountCode }),
                    ...(item.PurchaseDetails.COGSAccountCode !== undefined && { cogs_account_code: item.PurchaseDetails.COGSAccountCode }),
                    ...(item.PurchaseDetails.TaxType !== undefined && { tax_type: item.PurchaseDetails.TaxType })
                };
            }
            if (item.SalesDetails !== undefined) {
                mapped.sales_details = {
                    ...(item.SalesDetails.UnitPrice !== undefined && { unit_price: item.SalesDetails.UnitPrice }),
                    ...(item.SalesDetails.AccountCode !== undefined && { account_code: item.SalesDetails.AccountCode }),
                    ...(item.SalesDetails.TaxType !== undefined && { tax_type: item.SalesDetails.TaxType })
                };
            }
            if (item.IsTrackedAsInventory !== undefined) {
                mapped.is_tracked_as_inventory = item.IsTrackedAsInventory;
            }
            if (item.InventoryAssetAccountCode !== undefined) {
                mapped.inventory_asset_account_code = item.InventoryAssetAccountCode;
            }
            if (item.TotalCostPool !== undefined) {
                mapped.total_cost_pool = item.TotalCostPool;
            }
            if (item.QuantityOnHand !== undefined) {
                mapped.quantity_on_hand = item.QuantityOnHand;
            }
            if (item.UpdatedDateUTC !== undefined) {
                mapped.updated_date_utc = item.UpdatedDateUTC;
            }
            return mapped;
        });

        let nextPage: number | undefined;
        if (input.page !== undefined && providerData.Items.length === 100) {
            nextPage = input.page + 1;
        }

        return {
            items: items,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
