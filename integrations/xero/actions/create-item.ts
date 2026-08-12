import { z } from 'zod';
import { createAction } from 'nango';

const SalesDetailsInputSchema = z
    .object({
        UnitPrice: z.number().optional().describe('Unit price for sales transactions.'),
        AccountCode: z.string().optional().describe('Account code for sales transactions.'),
        TaxType: z.string().optional().describe('Tax type for sales transactions.'),
        COGSAccountCode: z.string().optional().describe('COGS account code for tracked inventory items.')
    })
    .describe('Sales details for the item.');

const PurchaseDetailsInputSchema = z
    .object({
        UnitPrice: z.number().optional().describe('Unit price for purchase transactions.'),
        AccountCode: z.string().optional().describe('Account code for purchase transactions.'),
        TaxType: z.string().optional().describe('Tax type for purchase transactions.'),
        COGSAccountCode: z.string().optional().describe('COGS account code for tracked inventory items.')
    })
    .describe('Purchase details for the item.');

const InputSchema = z
    .object({
        Code: z.string().describe('User-defined item code (max length 30).'),
        Name: z.string().optional().describe('Name of the item (max length 50).'),
        Description: z.string().optional().describe('Sales description of the item (max length 4000).'),
        PurchaseDescription: z.string().optional().describe('Purchase description of the item (max length 4000).'),
        IsSold: z.boolean().optional().describe('Whether the item is available for sales transactions. Defaults to true.'),
        IsPurchased: z.boolean().optional().describe('Whether the item is available for purchase transactions. Defaults to true.'),
        IsTrackedAsInventory: z.boolean().optional().describe('Whether the item is tracked as inventory.'),
        InventoryAssetAccountCode: z.string().optional().describe('Inventory asset account code. Required for tracked inventory items.'),
        SalesDetails: SalesDetailsInputSchema.optional().describe('Sales details for the item.'),
        PurchaseDetails: PurchaseDetailsInputSchema.optional().describe('Purchase details for the item.')
    })
    .describe('Input for creating a Xero item.');

const ProviderSalesDetailsSchema = z.object({
    UnitPrice: z.number().optional().describe('Unit price for sales transactions.'),
    AccountCode: z.string().optional().describe('Account code for sales transactions.'),
    TaxType: z.string().optional().describe('Tax type for sales transactions.'),
    COGSAccountCode: z.string().optional().describe('COGS account code for tracked inventory items.')
});

const ProviderPurchaseDetailsSchema = z.object({
    UnitPrice: z.number().optional().describe('Unit price for purchase transactions.'),
    AccountCode: z.string().optional().describe('Account code for purchase transactions.'),
    TaxType: z.string().optional().describe('Tax type for purchase transactions.'),
    COGSAccountCode: z.string().optional().describe('COGS account code for tracked inventory items.')
});

const ProviderItemSchema = z.object({
    ItemID: z.string().describe('Unique identifier for the item.'),
    Code: z.string().describe('User-defined item code.'),
    Name: z.string().optional().describe('Name of the item.'),
    Description: z.string().optional().describe('Sales description of the item.'),
    PurchaseDescription: z.string().optional().describe('Purchase description of the item.'),
    IsSold: z.boolean().optional().describe('Whether the item is available for sales transactions.'),
    IsPurchased: z.boolean().optional().describe('Whether the item is available for purchase transactions.'),
    IsTrackedAsInventory: z.boolean().optional().describe('Whether the item is tracked as inventory.'),
    InventoryAssetAccountCode: z.string().optional().describe('Inventory asset account code.'),
    TotalCostPool: z.number().optional().describe('Total value of the item on hand using average cost accounting.'),
    QuantityOnHand: z.number().optional().describe('Quantity of the item on hand.'),
    QuantityOnBackOrder: z.number().optional().describe('Quantity of the item on backorder.'),
    QuantityAvailable: z.number().optional().describe('Quantity of the item available.'),
    UpdatedDateUTC: z.string().optional().describe('Timestamp when the item was last updated.'),
    PurchaseDetails: ProviderPurchaseDetailsSchema.optional().describe('Purchase details for the item.'),
    SalesDetails: ProviderSalesDetailsSchema.optional().describe('Sales details for the item.')
});

const OutputSchema = ProviderItemSchema.describe('The created Xero item.');

const ProviderResponseSchema = z.object({
    Items: z.array(z.unknown())
});

/**
 * @tags: [write]
 * @tagReason: Creates a new inventory or catalog item in Xero.
 * @pitfalls: This action can only create new items and fails if the Code already exists. Tracked inventory items require InventoryAssetAccountCode and PurchaseDetails.COGSAccountCode.
 */
const action = createAction({
    description: 'Create an inventory or catalog item.',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices', 'accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config ?? {};
        const metadata = connection.metadata ?? {};

        let tenantId: string | undefined;
        if (
            typeof connectionConfig === 'object' &&
            connectionConfig !== null &&
            'tenant_id' in connectionConfig &&
            typeof connectionConfig['tenant_id'] === 'string'
        ) {
            tenantId = connectionConfig['tenant_id'];
        }
        if (!tenantId && typeof metadata === 'object' && metadata !== null && 'tenantId' in metadata && typeof metadata['tenantId'] === 'string') {
            tenantId = metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/requests-and-responses
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;
            if (!connectionsData || !Array.isArray(connectionsData)) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsData.length === 0) {
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

            const firstConnection = connectionsData[0];
            if (
                typeof firstConnection === 'object' &&
                firstConnection !== null &&
                'tenantId' in firstConnection &&
                typeof firstConnection.tenantId === 'string'
            ) {
                tenantId = firstConnection.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const payload: Record<string, unknown> = {
            Items: [
                {
                    Code: input.Code,
                    ...(input.Name !== undefined && { Name: input.Name }),
                    ...(input.Description !== undefined && { Description: input.Description }),
                    ...(input.PurchaseDescription !== undefined && { PurchaseDescription: input.PurchaseDescription }),
                    ...(input.IsSold !== undefined && { IsSold: input.IsSold }),
                    ...(input.IsPurchased !== undefined && { IsPurchased: input.IsPurchased }),
                    ...(input.IsTrackedAsInventory !== undefined && { IsTrackedAsInventory: input.IsTrackedAsInventory }),
                    ...(input.InventoryAssetAccountCode !== undefined && { InventoryAssetAccountCode: input.InventoryAssetAccountCode }),
                    ...(input.SalesDetails !== undefined && { SalesDetails: input.SalesDetails }),
                    ...(input.PurchaseDetails !== undefined && { PurchaseDetails: input.PurchaseDetails })
                }
            ]
        };

        // https://developer.xero.com/documentation/api/accounting/items
        const response = await nango.put({
            endpoint: 'api.xro/2.0/Items',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: payload,
            retries: 3
        });

        const responseData = response.data;
        if (!responseData || typeof responseData !== 'object' || Array.isArray(responseData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Xero API.'
            });
        }

        const parsedResponse = ProviderResponseSchema.safeParse(responseData);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Xero API response did not contain expected Items array.'
            });
        }

        if (parsedResponse.data.Items.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Xero API did not return any items.'
            });
        }

        const firstItem = parsedResponse.data.Items[0];
        const parsedItem = ProviderItemSchema.parse(firstItem);

        return parsedItem;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
