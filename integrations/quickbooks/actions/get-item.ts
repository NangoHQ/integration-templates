import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Item ID. Example: "123"')
});

const MetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const ProviderItemSchema = z.object({
    Id: z.string(),
    Name: z.string().optional(),
    FullyQualifiedName: z.string().optional(),
    Type: z.enum(['Inventory', 'NonInventory', 'Service', 'Group', 'Category']).optional(),
    Active: z.boolean().optional(),
    Description: z.string().optional(),
    UnitPrice: z.number().optional(),
    PurchaseCost: z.number().optional(),
    ExpenseAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    IncomeAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    AssetAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional(),
    TrackQtyOnHand: z.boolean().optional(),
    QtyOnHand: z.number().optional(),
    InvStartDate: z.string().optional(),
    MetaData: MetaDataSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    fully_qualified_name: z.string().optional(),
    type: z.enum(['Inventory', 'NonInventory', 'Service', 'Group', 'Category']).optional(),
    active: z.boolean().optional(),
    description: z.string().optional(),
    unit_price: z.number().optional(),
    purchase_cost: z.number().optional(),
    expense_account_id: z.string().optional(),
    income_account_id: z.string().optional(),
    asset_account_id: z.string().optional(),
    track_qty_on_hand: z.boolean().optional(),
    qty_on_hand: z.number().optional(),
    inv_start_date: z.string().optional(),
    create_time: z.string().optional(),
    last_updated_time: z.string().optional()
});

// Schema for the QuickBooks Get response which wraps the Item
const GetItemResponseSchema = z.object({
    Item: ProviderItemSchema
});

async function getRealmId(nango: { getConnection: () => Promise<{ connection_config?: Record<string, unknown> }> }): Promise<string> {
    const connection = await nango.getConnection();
    const connectionConfig = connection.connection_config;
    const realmId = connectionConfig ? connectionConfig['realmId'] : undefined;

    if (typeof realmId !== 'string' || !realmId) {
        throw new Error('realmId not found in the connection configuration. Please reauthenticate to set the realmId');
    }

    return realmId;
}

const action = createAction({
    description: 'Retrieve an item by ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/item#get-an-item
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/item/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || response.data === null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Item not found',
                id: input.id
            });
        }

        // QuickBooks API returns the item wrapped in an "Item" key
        const parsedResponse = GetItemResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Item not found or invalid response format',
                id: input.id
            });
        }

        const providerItem = parsedResponse.data.Item;

        return {
            id: providerItem.Id,
            ...(providerItem.Name !== undefined && { name: providerItem.Name }),
            ...(providerItem.FullyQualifiedName !== undefined && {
                fully_qualified_name: providerItem.FullyQualifiedName
            }),
            ...(providerItem.Type !== undefined && { type: providerItem.Type }),
            ...(providerItem.Active !== undefined && { active: providerItem.Active }),
            ...(providerItem.Description !== undefined && { description: providerItem.Description }),
            ...(providerItem.UnitPrice !== undefined && { unit_price: providerItem.UnitPrice }),
            ...(providerItem.PurchaseCost !== undefined && { purchase_cost: providerItem.PurchaseCost }),
            ...(providerItem.ExpenseAccountRef !== undefined && {
                expense_account_id: providerItem.ExpenseAccountRef.value
            }),
            ...(providerItem.IncomeAccountRef !== undefined && {
                income_account_id: providerItem.IncomeAccountRef.value
            }),
            ...(providerItem.AssetAccountRef !== undefined && {
                asset_account_id: providerItem.AssetAccountRef.value
            }),
            ...(providerItem.TrackQtyOnHand !== undefined && {
                track_qty_on_hand: providerItem.TrackQtyOnHand
            }),
            ...(providerItem.QtyOnHand !== undefined && { qty_on_hand: providerItem.QtyOnHand }),
            ...(providerItem.InvStartDate !== undefined && { inv_start_date: providerItem.InvStartDate }),
            ...(providerItem.MetaData?.CreateTime !== undefined && {
                create_time: providerItem.MetaData.CreateTime
            }),
            ...(providerItem.MetaData?.LastUpdatedTime !== undefined && {
                last_updated_time: providerItem.MetaData.LastUpdatedTime
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
