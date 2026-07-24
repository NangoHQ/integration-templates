import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe('Company / data area ID. Example: "dat"'),
    itemNumber: z.string().describe('Item number. May contain leading or trailing whitespace. Example: " RFI-TEST-001"')
});

const ReleasedProductSchema = z
    .object({
        dataAreaId: z.string().optional(),
        ItemNumber: z.string().optional(),
        ProductName: z.string().optional(),
        ProductSearchName: z.string().optional(),
        ProductGroupId: z.string().optional(),
        ItemModelGroupId: z.string().optional(),
        UnitOfMeasureSymbol: z.string().optional(),
        SalesUnitOfMeasureSymbol: z.string().optional(),
        PurchaseUnitOfMeasureSymbol: z.string().optional(),
        InventoryUnitOfMeasureSymbol: z.string().optional(),
        ProductType: z.string().optional(),
        ProductSubType: z.string().optional(),
        SearchName: z.string().optional(),
        ProductNumber: z.string().optional(),
        IsStockedProduct: z.boolean().optional(),
        IsBlocked: z.boolean().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a released product',
    version: '1.0.0',
    input: InputSchema,
    output: ReleasedProductSchema,
    scopes: ['Financials.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof ReleasedProductSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: `/data/ReleasedProductsV2(dataAreaId='${encodeURIComponent(input.dataAreaId.replace(/'/g, "''"))}',ItemNumber='${encodeURIComponent(input.itemNumber.replace(/'/g, "''"))}')`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Released product not found',
                dataAreaId: input.dataAreaId,
                itemNumber: input.itemNumber
            });
        }

        const product = ReleasedProductSchema.parse(response.data);
        return product;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
