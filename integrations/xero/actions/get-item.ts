import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        itemId: z.string().describe('Unique identifier of the Xero item to retrieve. Example: "ffce51d9-4f4c-4b5d-9f07-dab11ef220ba"')
    })
    .describe('Input for retrieving a Xero item by ID.');

const PurchaseDetailsSchema = z.object({
    UnitPrice: z.number().optional().describe('Unit price for purchasing the item.'),
    AccountCode: z.string().optional().describe('Account code used for purchase transactions.'),
    TaxType: z.string().optional().describe('Tax type applied to purchase transactions.'),
    COGSAccountCode: z.string().optional().describe('Cost of goods sold account code for purchase transactions.')
});

const SalesDetailsSchema = z.object({
    UnitPrice: z.number().optional().describe('Unit price for selling the item.'),
    AccountCode: z.string().optional().describe('Account code used for sales transactions.'),
    TaxType: z.string().optional().describe('Tax type applied to sales transactions.')
});

const OutputSchema = z
    .looseObject({
        ItemID: z.string().describe('Unique identifier for the item.'),
        Code: z.string().describe('Unique code for the item.'),
        Name: z.string().optional().describe('Name of the item.'),
        IsSold: z.boolean().optional().describe('Whether the item is sold.'),
        IsPurchased: z.boolean().optional().describe('Whether the item is purchased.'),
        IsTrackedAsInventory: z.boolean().optional().describe('Whether the item is tracked as inventory.'),
        InventoryAssetAccountCode: z.string().optional().describe('Account code for the inventory asset.'),
        TotalCostPool: z.number().optional().describe('Total cost pool for inventory tracking.'),
        QuantityOnHand: z.number().optional().describe('Quantity on hand for inventory tracking.'),
        PurchaseDescription: z.string().optional().describe('Description used for purchase transactions.'),
        Description: z.string().optional().describe('Description used for sales transactions.'),
        PurchaseDetails: PurchaseDetailsSchema.optional().describe('Details used when purchasing the item.'),
        SalesDetails: SalesDetailsSchema.optional().describe('Details used when selling the item.'),
        UpdatedDateUTC: z.string().optional().describe('UTC timestamp when the item was last updated.')
    })
    .describe('Output representing a retrieved Xero item.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing Xero item by ID without modifying provider data.
 * @pitfalls: Hard-deleted items return 404 with no tombstone or status field. UpdatedDateUTC is returned in Microsoft JSON Date format (/Date(...)/) rather than ISO 8601.
 */
const action = createAction({
    description: 'Retrieve an item by ItemID.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = z
            .object({
                connection_config: z.record(z.string(), z.unknown()).optional().nullable(),
                metadata: z.record(z.string(), z.unknown()).optional().nullable()
            })
            .parse(await nango.getConnection());

        const configTenantId = connection.connection_config?.['tenant_id'];
        const metadataTenantId = connection.metadata?.['tenantId'];

        let resolvedTenantId: string | undefined;
        if (typeof configTenantId === 'string' && configTenantId.length > 0) {
            resolvedTenantId = configTenantId;
        } else if (typeof metadataTenantId === 'string' && metadataTenantId.length > 0) {
            resolvedTenantId = metadataTenantId;
        } else {
            // https://developer.xero.com/documentation/api/overview/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;
            if (!Array.isArray(connectionsData) || connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = z.object({ tenantId: z.string() }).safeParse(connectionsData[0]);
            if (firstConnection.success && firstConnection.data.tenantId.length > 0) {
                resolvedTenantId = firstConnection.data.tenantId;
            }
        }

        if (!resolvedTenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/items
        const response = await nango.get({
            endpoint: `api.xro/2.0/Items/${encodeURIComponent(input.itemId)}`,
            headers: {
                'xero-tenant-id': resolvedTenantId
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Item with ID ${input.itemId} not found.`,
                itemId: input.itemId
            });
        }

        const wrapper = z
            .looseObject({
                Items: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        if (!wrapper.Items || wrapper.Items.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Item with ID ${input.itemId} not found.`,
                itemId: input.itemId
            });
        }

        const firstItem = wrapper.Items[0];
        if (!firstItem) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Item with ID ${input.itemId} not found.`,
                itemId: input.itemId
            });
        }

        const item = OutputSchema.parse(firstItem);

        return item;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
