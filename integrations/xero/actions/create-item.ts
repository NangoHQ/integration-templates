import { z } from 'zod';
import { createAction } from 'nango';

const PurchaseDetailsSchema = z.object({
    UnitPrice: z.number().optional().describe('Unit price for purchase'),
    AccountCode: z.string().optional().describe('Account code for purchase'),
    COGSAccountCode: z.string().optional().describe('Cost of goods sold account code'),
    TaxType: z.string().optional().describe('Tax type for purchase')
});

const SalesDetailsSchema = z.object({
    UnitPrice: z.number().optional().describe('Unit price for sales'),
    AccountCode: z.string().optional().describe('Account code for sales'),
    TaxType: z.string().optional().describe('Tax type for sales')
});

const InputSchema = z
    .object({
        Code: z.string().max(30).describe('User defined item code (max 30 characters). Example: "ITEM-001"'),
        Name: z.string().optional().describe('Name of the item. Example: "Sample Product"'),
        Description: z.string().optional().describe('Description of the item'),
        PurchaseDescription: z.string().optional().describe('Description shown on purchase transactions'),
        IsTrackedAsInventory: z.boolean().optional().describe('Whether the item is tracked as inventory'),
        InventoryAssetAccountCode: z.string().optional().describe('Inventory asset account code (required if IsTrackedAsInventory is true)'),
        IsSold: z.boolean().optional().describe('Whether the item is sold'),
        IsPurchased: z.boolean().optional().describe('Whether the item is purchased'),
        PurchaseDetails: PurchaseDetailsSchema.optional().describe('Purchase details for the item'),
        SalesDetails: SalesDetailsSchema.optional().describe('Sales details for the item')
    })
    .superRefine((data, ctx) => {
        if (data.IsTrackedAsInventory) {
            if (!data.InventoryAssetAccountCode) {
                ctx.addIssue({ code: 'custom', path: ['InventoryAssetAccountCode'], message: 'Required when IsTrackedAsInventory is true' });
            }
            if (!data.PurchaseDetails?.COGSAccountCode) {
                ctx.addIssue({ code: 'custom', path: ['PurchaseDetails', 'COGSAccountCode'], message: 'Required when IsTrackedAsInventory is true' });
            }
        }
    });

const ItemOutputSchema = z.object({
    ItemID: z.string(),
    Code: z.string(),
    Name: z.union([z.string(), z.null()]).optional(),
    Description: z.union([z.string(), z.null()]).optional(),
    PurchaseDescription: z.union([z.string(), z.null()]).optional(),
    IsTrackedAsInventory: z.union([z.boolean(), z.null()]).optional(),
    InventoryAssetAccountCode: z.union([z.string(), z.null()]).optional(),
    IsSold: z.union([z.boolean(), z.null()]).optional(),
    IsPurchased: z.union([z.boolean(), z.null()]).optional(),
    PurchaseDetails: z.union([PurchaseDetailsSchema, z.null()]).optional(),
    SalesDetails: z.union([SalesDetailsSchema, z.null()]).optional()
});

const OutputSchema = z.object({
    Items: z.array(ItemOutputSchema)
});

type NangoActionType = Parameters<Parameters<typeof createAction>[0]['exec']>[0];

async function resolveTenantId(nango: NangoActionType): Promise<string> {
    const connection = await nango.getConnection();

    if (connection && typeof connection === 'object') {
        const config = connection['connection_config'];
        if (config && typeof config === 'object' && !Array.isArray(config)) {
            const tenantIdFromConfig = config['tenant_id'];
            if (typeof tenantIdFromConfig === 'string') {
                return tenantIdFromConfig;
            }
        }

        const metadata = connection['metadata'];
        if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
            const tenantIdFromMetadata = metadata['tenantId'];
            if (typeof tenantIdFromMetadata === 'string') {
                return tenantIdFromMetadata;
            }
        }
    }

    // https://developer.xero.com/documentation/api/accounting/overview
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    if (!connectionsResponse.data || typeof connectionsResponse.data !== 'object' || Array.isArray(connectionsResponse.data)) {
        throw new nango.ActionError({
            type: 'invalid_response',
            message: 'Invalid connections response format'
        });
    }

    const responseData = connectionsResponse.data;
    const connections = responseData['data'];

    if (!connections || !Array.isArray(connections) || connections.length === 0) {
        throw new nango.ActionError({
            type: 'no_tenant',
            message: 'No Xero tenant found for this connection'
        });
    }

    if (connections.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const firstConnection = connections[0];
    if (!firstConnection || typeof firstConnection !== 'object' || Array.isArray(firstConnection)) {
        throw new nango.ActionError({
            type: 'invalid_tenant',
            message: 'Invalid tenant connection format'
        });
    }

    const tenantId = firstConnection['tenantId'];
    if (typeof tenantId !== 'string') {
        throw new nango.ActionError({
            type: 'invalid_tenant',
            message: 'Invalid tenant ID in connection response'
        });
    }

    return tenantId;
}

const action = createAction({
    description: 'Create an inventory or catalog item',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        const itemPayload: Record<string, unknown> = {
            Code: input.Code
        };

        if (input.Name !== undefined) {
            itemPayload['Name'] = input.Name;
        }
        if (input.Description !== undefined) {
            itemPayload['Description'] = input.Description;
        }
        if (input.PurchaseDescription !== undefined) {
            itemPayload['PurchaseDescription'] = input.PurchaseDescription;
        }
        if (input.IsTrackedAsInventory !== undefined) {
            itemPayload['IsTrackedAsInventory'] = input.IsTrackedAsInventory;
        }
        if (input.InventoryAssetAccountCode !== undefined) {
            itemPayload['InventoryAssetAccountCode'] = input.InventoryAssetAccountCode;
        }
        if (input.IsSold !== undefined) {
            itemPayload['IsSold'] = input.IsSold;
        }
        if (input.IsPurchased !== undefined) {
            itemPayload['IsPurchased'] = input.IsPurchased;
        }
        if (input.PurchaseDetails !== undefined) {
            itemPayload['PurchaseDetails'] = input.PurchaseDetails;
        }
        if (input.SalesDetails !== undefined) {
            itemPayload['SalesDetails'] = input.SalesDetails;
        }

        // https://developer.xero.com/documentation/api/accounting/items
        const response = await nango.put({
            endpoint: 'api.xro/2.0/Items',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Items: [itemPayload]
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response data from Xero API'
            });
        }

        const items = response.data['Items'];
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'No items returned from Xero API'
            });
        }

        const firstItem = items[0];
        if (!firstItem || typeof firstItem !== 'object' || Array.isArray(firstItem)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid item format in response'
            });
        }

        const itemId = firstItem['ItemID'];
        const code = firstItem['Code'];

        if (typeof itemId !== 'string' || typeof code !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing required fields in response'
            });
        }

        const getStringOrNull = (value: unknown): string | null => {
            if (typeof value === 'string') return value;
            if (value === null) return null;
            return null;
        };

        const getBooleanOrNull = (value: unknown): boolean | null => {
            if (typeof value === 'boolean') return value;
            if (value === null) return null;
            return null;
        };

        const getObjectOrNull = (value: unknown): Record<string, unknown> | null => {
            if (value === null) return null;
            if (typeof value !== 'object') return null;
            if (Array.isArray(value)) return null;
            const entries = Object.entries(value);
            return Object.fromEntries(entries);
        };

        const mappedItem = {
            ItemID: itemId,
            Code: code,
            Name: getStringOrNull(firstItem['Name']),
            Description: getStringOrNull(firstItem['Description']),
            PurchaseDescription: getStringOrNull(firstItem['PurchaseDescription']),
            IsTrackedAsInventory: getBooleanOrNull(firstItem['IsTrackedAsInventory']),
            InventoryAssetAccountCode: getStringOrNull(firstItem['InventoryAssetAccountCode']),
            IsSold: getBooleanOrNull(firstItem['IsSold']),
            IsPurchased: getBooleanOrNull(firstItem['IsPurchased']),
            PurchaseDetails: getObjectOrNull(firstItem['PurchaseDetails']),
            SalesDetails: getObjectOrNull(firstItem['SalesDetails'])
        };

        return { Items: [mappedItem] };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
