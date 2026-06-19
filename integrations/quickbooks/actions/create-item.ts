import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('Name of the item. Must be unique. Example: "Office Supplies"'),
    type: z.enum(['Inventory', 'Service', 'NonInventory', 'Product', 'Group', 'Category']).describe('Type of item'),
    description: z.string().optional().describe('Description for sales transactions'),
    unitPrice: z.number().optional().describe('Unit price for sales'),
    incomeAccountId: z.string().optional().describe('ID of the income account. Required for Inventory, Service, Product, Other Charge types'),
    expenseAccountId: z.string().optional().describe('ID of the expense account. Required when purchase information is provided'),
    assetAccountId: z.string().optional().describe('ID of the asset account. Required for Inventory type'),
    trackQtyOnHand: z.boolean().optional().describe('Whether to track quantity on hand. Required for Inventory type'),
    qtyOnHand: z.number().optional().describe('Initial quantity on hand. Required for Inventory type'),
    purchaseDescription: z.string().optional().describe('Description for purchase transactions'),
    purchaseCost: z.number().optional().describe('Cost for purchasing'),
    taxable: z.boolean().optional().describe('Whether the item is taxable'),
    active: z.boolean().optional().describe('Whether the item is active')
});

const ProviderAccountRefSchema = z.object({
    value: z.string(),
    name: z.string().optional()
});

const ProviderMetaDataSchema = z.object({
    CreateTime: z.string(),
    LastUpdatedTime: z.string()
});

const ProviderItemSchema = z.object({
    Id: z.string(),
    Name: z.string(),
    Type: z.string(),
    Active: z.boolean().optional(),
    FullyQualifiedName: z.string().optional(),
    Taxable: z.boolean().optional(),
    UnitPrice: z.number().optional(),
    Description: z.string().optional(),
    PurchaseDesc: z.string().optional(),
    PurchaseCost: z.number().optional(),
    IncomeAccountRef: ProviderAccountRefSchema.optional(),
    ExpenseAccountRef: ProviderAccountRefSchema.optional(),
    AssetAccountRef: ProviderAccountRefSchema.optional(),
    TrackQtyOnHand: z.boolean().optional(),
    QtyOnHand: z.number().optional(),
    InvStartDate: z.string().optional(),
    domain: z.string().optional(),
    sparse: z.boolean().optional(),
    SyncToken: z.string(),
    MetaData: ProviderMetaDataSchema
});

const ProviderResponseSchema = z.object({
    Item: ProviderItemSchema
});

const OutputSchema = z.object({
    id: z.string().describe('The unique QuickBooks Item ID'),
    name: z.string().describe('Name of the item'),
    type: z.string().describe('Type of item'),
    active: z.boolean().optional().describe('Whether the item is active'),
    taxable: z.boolean().optional().describe('Whether the item is taxable'),
    unitPrice: z.number().optional().describe('Unit price for sales'),
    description: z.string().optional().describe('Description for sales'),
    purchaseDescription: z.string().optional().describe('Description for purchases'),
    purchaseCost: z.number().optional().describe('Purchase cost'),
    incomeAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .describe('Income account reference'),
    expenseAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .describe('Expense account reference'),
    assetAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .describe('Asset account reference'),
    trackQtyOnHand: z.boolean().optional().describe('Track quantity on hand'),
    qtyOnHand: z.number().optional().describe('Quantity on hand'),
    syncToken: z.string().describe('Sync token for optimistic locking'),
    createdAt: z.string().describe('Creation timestamp'),
    updatedAt: z.string().describe('Last update timestamp')
});

async function getCompany(nango: Parameters<Parameters<typeof createAction>[0]['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const connectionConfig = connection.connection_config;
    if (!connectionConfig || typeof connectionConfig !== 'object') {
        throw new nango.ActionError({
            type: 'missing_connection_config',
            message: 'Connection configuration not found. Please reauthenticate.'
        });
    }
    const realmId = connectionConfig['realmId'];
    if (!realmId || typeof realmId !== 'string') {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }
    return realmId;
}

const action = createAction({
    description: 'Create a product or service item',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getCompany(nango);

        const requestBody: Record<string, unknown> = {
            Name: input.name,
            Type: input.type
        };

        if (input.description !== undefined) {
            requestBody['Description'] = input.description;
        }

        if (input.unitPrice !== undefined) {
            requestBody['UnitPrice'] = input.unitPrice;
        }

        if (input.taxable !== undefined) {
            requestBody['Taxable'] = input.taxable;
        }

        if (input.active !== undefined) {
            requestBody['Active'] = input.active;
        }

        if (input.purchaseDescription !== undefined) {
            requestBody['PurchaseDesc'] = input.purchaseDescription;
        }

        if (input.purchaseCost !== undefined) {
            requestBody['PurchaseCost'] = input.purchaseCost;
        }

        if (input.incomeAccountId !== undefined) {
            requestBody['IncomeAccountRef'] = {
                value: input.incomeAccountId
            };
        }

        if (input.expenseAccountId !== undefined) {
            requestBody['ExpenseAccountRef'] = {
                value: input.expenseAccountId
            };
        }

        if (input.assetAccountId !== undefined) {
            requestBody['AssetAccountRef'] = {
                value: input.assetAccountId
            };
        }

        if (input.trackQtyOnHand !== undefined) {
            requestBody['TrackQtyOnHand'] = input.trackQtyOnHand;
        }

        if (input.qtyOnHand !== undefined) {
            requestBody['QtyOnHand'] = input.qtyOnHand;
        }

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/item
        const response = await nango.post({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/item`,
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Empty response from QuickBooks API'
            });
        }

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const item = parsedResponse.Item;

        return {
            id: item.Id,
            name: item.Name,
            type: item.Type,
            active: item.Active,
            taxable: item.Taxable,
            unitPrice: item.UnitPrice,
            description: item.Description,
            purchaseDescription: item.PurchaseDesc,
            purchaseCost: item.PurchaseCost,
            incomeAccountRef: item.IncomeAccountRef,
            expenseAccountRef: item.ExpenseAccountRef,
            assetAccountRef: item.AssetAccountRef,
            trackQtyOnHand: item.TrackQtyOnHand,
            qtyOnHand: item.QtyOnHand,
            syncToken: item.SyncToken,
            createdAt: item.MetaData.CreateTime,
            updatedAt: item.MetaData.LastUpdatedTime
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
