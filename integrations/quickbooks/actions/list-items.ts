import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (STARTPOSITION value). Omit for the first page.')
});

const ItemMetaDataSchema = z.object({
    CreateTime: z.string().optional(),
    LastUpdatedTime: z.string().optional()
});

const ItemSchema = z.object({
    Id: z.string(),
    Name: z.string().optional(),
    Description: z.string().optional().nullable(),
    Active: z.boolean().optional(),
    Type: z.string().optional(),
    IncomeAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .nullable(),
    ExpenseAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .nullable(),
    AssetAccountRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .nullable(),
    QtyOnHand: z.number().optional().nullable(),
    InvStartDate: z.string().optional().nullable(),
    PurchaseCost: z.number().optional().nullable(),
    UnitPrice: z.number().optional().nullable(),
    PurchaseDesc: z.string().optional().nullable(),
    Taxable: z.boolean().optional(),
    SalesTaxCodeRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .nullable(),
    PurchaseTaxCodeRef: z
        .object({
            value: z.string(),
            name: z.string().optional()
        })
        .optional()
        .nullable(),
    MetaData: ItemMetaDataSchema.optional()
});

const QueryResponseSchema = z.object({
    Item: z.array(ItemSchema).optional()
});

const ProviderResponseSchema = z.object({
    QueryResponse: QueryResponseSchema
});

const ItemOutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    active: z.boolean().optional(),
    type: z.string().optional(),
    income_account_id: z.string().optional(),
    expense_account_id: z.string().optional(),
    asset_account_id: z.string().optional(),
    quantity_on_hand: z.number().optional(),
    inventory_start_date: z.string().optional(),
    purchase_cost: z.number().optional(),
    unit_price: z.number().optional(),
    purchase_description: z.string().optional(),
    taxable: z.boolean().optional(),
    sales_tax_code_id: z.string().optional(),
    purchase_tax_code_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ItemOutputSchema),
    next_cursor: z.string().optional()
});

async function getRealmId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();
    const realmId = connection.connection_config?.['realmId'];
    if (!realmId) {
        throw new nango.ActionError({
            type: 'missing_realm_id',
            message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
        });
    }
    return realmId;
}

function mapProviderItem(item: z.infer<typeof ItemSchema>): z.infer<typeof ItemOutputSchema> {
    return {
        id: item.Id,
        ...(item.Name !== undefined && { name: item.Name }),
        ...(item.Description !== undefined && item.Description !== null && { description: item.Description }),
        ...(item.Active !== undefined && { active: item.Active }),
        ...(item.Type !== undefined && { type: item.Type }),
        ...(item.IncomeAccountRef !== undefined &&
            item.IncomeAccountRef !== null && {
                income_account_id: item.IncomeAccountRef.value
            }),
        ...(item.ExpenseAccountRef !== undefined &&
            item.ExpenseAccountRef !== null && {
                expense_account_id: item.ExpenseAccountRef.value
            }),
        ...(item.AssetAccountRef !== undefined &&
            item.AssetAccountRef !== null && {
                asset_account_id: item.AssetAccountRef.value
            }),
        ...(item.QtyOnHand !== undefined && item.QtyOnHand !== null && { quantity_on_hand: item.QtyOnHand }),
        ...(item.InvStartDate !== undefined && item.InvStartDate !== null && { inventory_start_date: item.InvStartDate }),
        ...(item.PurchaseCost !== undefined && item.PurchaseCost !== null && { purchase_cost: item.PurchaseCost }),
        ...(item.UnitPrice !== undefined && item.UnitPrice !== null && { unit_price: item.UnitPrice }),
        ...(item.PurchaseDesc !== undefined && item.PurchaseDesc !== null && { purchase_description: item.PurchaseDesc }),
        ...(item.Taxable !== undefined && { taxable: item.Taxable }),
        ...(item.SalesTaxCodeRef !== undefined &&
            item.SalesTaxCodeRef !== null && {
                sales_tax_code_id: item.SalesTaxCodeRef.value
            }),
        ...(item.PurchaseTaxCodeRef !== undefined &&
            item.PurchaseTaxCodeRef !== null && {
                purchase_tax_code_id: item.PurchaseTaxCodeRef.value
            }),
        ...(item.MetaData?.CreateTime !== undefined && { created_at: item.MetaData.CreateTime }),
        ...(item.MetaData?.LastUpdatedTime !== undefined && {
            updated_at: item.MetaData.LastUpdatedTime
        })
    };
}

const MAX_RESULTS = 100;

const action = createAction({
    description: 'List items with the QuickBooks query endpoint.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-items',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const realmId = await getRealmId(nango);

        let startPosition = 1;
        if (input.cursor) {
            const n = Number(input.cursor);
            if (!Number.isInteger(n) || n < 1) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'Invalid cursor value. Cursor must be a positive integer representing STARTPOSITION.'
                });
            }
            startPosition = n;
        }

        const query = `SELECT * FROM Item STARTPOSITION ${startPosition} MAXRESULTS ${MAX_RESULTS}`;

        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/query
        const response = await nango.get({
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/query`,
            params: {
                query: query
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const items = parsed.QueryResponse.Item ?? [];

        const mappedItems = items.map(mapProviderItem);

        const nextStartPosition = items.length === MAX_RESULTS ? startPosition + MAX_RESULTS : null;

        return {
            items: mappedItems,
            ...(nextStartPosition !== null && { next_cursor: String(nextStartPosition) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
