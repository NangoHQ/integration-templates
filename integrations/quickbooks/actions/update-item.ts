import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    Id: z.string().describe('The QuickBooks Item ID. Example: "1"'),
    SyncToken: z.string().describe('The SyncToken value from the existing item to prevent conflicts.'),
    Name: z.string().optional().describe('New name for the item.'),
    Description: z.string().nullable().optional().describe('New description for the item.'),
    UnitPrice: z.number().nullable().optional().describe('Unit price of the item.'),
    Type: z.enum(['Inventory', 'NonInventory', 'Service']).optional().describe('Type of item.'),
    IncomeAccountRef: z.object({ value: z.string(), name: z.string().optional() }).optional().describe('Income account reference.'),
    ExpenseAccountRef: z.object({ value: z.string(), name: z.string().optional() }).optional().describe('Expense account reference.'),
    AssetAccountRef: z.object({ value: z.string(), name: z.string().optional() }).optional().describe('Asset account reference for inventory items.'),
    QtyOnHand: z.number().nullable().optional().describe('Quantity on hand for inventory items.'),
    PurchaseCost: z.number().nullable().optional().describe('Purchase cost for inventory items.'),
    Active: z.boolean().optional().describe('Whether the item is active.')
});

const ProviderItemSchema = z.object({
    Id: z.string(),
    SyncToken: z.string(),
    Name: z.string(),
    Description: z.string().nullable().optional(),
    UnitPrice: z.number().nullable().optional(),
    Type: z.string(),
    IncomeAccountRef: z.object({ value: z.string(), name: z.string().optional() }).optional(),
    ExpenseAccountRef: z.object({ value: z.string(), name: z.string().optional() }).optional(),
    AssetAccountRef: z.object({ value: z.string(), name: z.string().optional() }).optional(),
    QtyOnHand: z.number().nullable().optional(),
    PurchaseCost: z.number().nullable().optional(),
    Active: z.boolean(),
    MetaData: z.object({
        CreateTime: z.string(),
        LastUpdatedTime: z.string()
    })
});

const OutputSchema = z.object({
    Id: z.string(),
    SyncToken: z.string(),
    Name: z.string(),
    Description: z.string().nullable().optional(),
    UnitPrice: z.number().nullable().optional(),
    Type: z.string(),
    IncomeAccountRef: z.object({ value: z.string(), name: z.string().optional() }).optional(),
    ExpenseAccountRef: z.object({ value: z.string(), name: z.string().optional() }).optional(),
    AssetAccountRef: z.object({ value: z.string(), name: z.string().optional() }).optional(),
    QtyOnHand: z.number().nullable().optional(),
    PurchaseCost: z.number().nullable().optional(),
    Active: z.boolean(),
    MetaData: z.object({
        CreateTime: z.string(),
        LastUpdatedTime: z.string()
    })
});

async function getRealmId(nango: { getConnection: () => Promise<{ connection_config: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }
    return realmId;
}

type RequestBody = {
    Id: string;
    SyncToken: string;
    Name?: string;
    Description?: string | null;
    UnitPrice?: number | null;
    Type?: string;
    IncomeAccountRef?: { value: string; name?: string | undefined };
    ExpenseAccountRef?: { value: string; name?: string | undefined };
    AssetAccountRef?: { value: string; name?: string | undefined };
    QtyOnHand?: number | null;
    PurchaseCost?: number | null;
    Active?: boolean;
    sparse: boolean;
};

function buildRequestBody(input: z.infer<typeof InputSchema>): RequestBody {
    const body: RequestBody = {
        Id: input.Id,
        SyncToken: input.SyncToken,
        sparse: true
    };

    // Build sparse update body - only include fields that are provided
    if (input.Name !== undefined) {
        body.Name = input.Name;
    }
    if (input.Description !== undefined) {
        body.Description = input.Description;
    }
    if (input.UnitPrice !== undefined) {
        body.UnitPrice = input.UnitPrice;
    }
    if (input.Type !== undefined) {
        body.Type = input.Type;
    }
    if (input.IncomeAccountRef !== undefined) {
        body.IncomeAccountRef = input.IncomeAccountRef;
    }
    if (input.ExpenseAccountRef !== undefined) {
        body.ExpenseAccountRef = input.ExpenseAccountRef;
    }
    if (input.AssetAccountRef !== undefined) {
        body.AssetAccountRef = input.AssetAccountRef;
    }
    if (input.QtyOnHand !== undefined) {
        body.QtyOnHand = input.QtyOnHand;
    }
    if (input.PurchaseCost !== undefined) {
        body.PurchaseCost = input.PurchaseCost;
    }
    if (input.Active !== undefined) {
        body.Active = input.Active;
    }

    return body;
}

const action = createAction({
    description: 'Update a QuickBooks item using its current SyncToken with sparse update support.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);
        const requestBody = buildRequestBody(input);

        const config: ProxyConfiguration = {
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/item
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/item`,
            data: requestBody,
            headers: {
                'Content-Type': 'application/json'
            },
            retries: 3
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Item not found or update failed',
                Id: input.Id
            });
        }

        // Parse and validate the response
        const itemData = ProviderItemSchema.safeParse(response.data.Item);
        if (!itemData.success) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Failed to validate QuickBooks Item response',
                details: itemData.error.format()
            });
        }

        const item = itemData.data;

        return {
            Id: item.Id,
            SyncToken: item.SyncToken,
            Name: item.Name,
            ...(item.Description !== undefined && { Description: item.Description }),
            ...(item.UnitPrice !== undefined && { UnitPrice: item.UnitPrice }),
            Type: item.Type,
            ...(item.IncomeAccountRef !== undefined && { IncomeAccountRef: item.IncomeAccountRef }),
            ...(item.ExpenseAccountRef !== undefined && { ExpenseAccountRef: item.ExpenseAccountRef }),
            ...(item.AssetAccountRef !== undefined && { AssetAccountRef: item.AssetAccountRef }),
            ...(item.QtyOnHand !== undefined && { QtyOnHand: item.QtyOnHand }),
            ...(item.PurchaseCost !== undefined && { PurchaseCost: item.PurchaseCost }),
            Active: item.Active,
            MetaData: item.MetaData
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
