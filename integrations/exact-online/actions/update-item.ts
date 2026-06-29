import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Item ID. Example: "61facaed-0389-4183-bf67-ac1c179e1050"'),
    code: z.string().optional().describe('Item code'),
    description: z.string().optional().describe('Item description'),
    extraDescription: z.string().nullable().optional().describe('Extra description'),
    itemGroup: z.string().optional().describe('Item group ID. Example: "e54a5a52-21b7-4ce5-80ed-976b2100c02b"'),
    salesVatCode: z.string().optional().describe('Sales VAT code ID'),
    startDate: z.string().optional().describe('Start date. ISO format: "2024-05-30"'),
    unit: z.string().optional().describe('Unit of measurement'),
    isSalesItem: z.boolean().optional().describe('Whether this is a sales item'),
    isPurchaseItem: z.boolean().optional().describe('Whether this is a purchase item'),
    isStockItem: z.boolean().optional().describe('Whether this is a stock item'),
    costPriceStandard: z.number().optional().describe('Standard cost price'),
    salesPrice: z.number().optional().describe('Sales price')
});

const ProviderItemSchema = z.object({
    ID: z.string().optional(),
    Code: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    ExtraDescription: z.string().nullable().optional(),
    ItemGroup: z.string().nullable().optional(),
    SalesVatCode: z.string().nullable().optional(),
    StartDate: z.string().nullable().optional(),
    Unit: z.string().nullable().optional(),
    IsSalesItem: z.boolean().nullable().optional(),
    IsPurchaseItem: z.boolean().nullable().optional(),
    IsStockItem: z.boolean().nullable().optional(),
    CostPriceStandard: z.number().nullable().optional(),
    SalesPrice: z.number().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    code: z.string().optional(),
    description: z.string().optional(),
    extraDescription: z.string().optional(),
    itemGroup: z.string().optional(),
    salesVatCode: z.string().optional(),
    startDate: z.string().optional(),
    unit: z.string().optional(),
    isSalesItem: z.boolean().optional(),
    isPurchaseItem: z.boolean().optional(),
    isStockItem: z.boolean().optional(),
    costPriceStandard: z.number().optional(),
    salesPrice: z.number().optional()
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const ItemResponseSchema = z.object({
    d: z
        .object({
            __metadata: z
                .object({
                    uri: z.string().optional()
                })
                .passthrough()
                .optional()
        })
        .passthrough()
});

const action = createAction({
    description: 'Update an existing item/product',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Items'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://start.exactonline.fr/docs/services/System/Me
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const currentDivision = meData.d.results[0]?.CurrentDivision;
        if (!currentDivision) {
            throw new nango.ActionError({
                type: 'division_not_found',
                message: 'Could not determine current division from Me endpoint'
            });
        }

        const updateData: Record<string, unknown> = {
            ...(input.code !== undefined && { Code: input.code }),
            ...(input.description !== undefined && { Description: input.description }),
            ...(input.extraDescription !== undefined && { ExtraDescription: input.extraDescription }),
            ...(input.itemGroup !== undefined && { ItemGroup: input.itemGroup }),
            ...(input.salesVatCode !== undefined && { SalesVatCode: input.salesVatCode }),
            ...(input.startDate !== undefined && { StartDate: input.startDate }),
            ...(input.unit !== undefined && { Unit: input.unit }),
            ...(input.isSalesItem !== undefined && { IsSalesItem: input.isSalesItem }),
            ...(input.isPurchaseItem !== undefined && { IsPurchaseItem: input.isPurchaseItem }),
            ...(input.isStockItem !== undefined && { IsStockItem: input.isStockItem }),
            ...(input.costPriceStandard !== undefined && { CostPriceStandard: input.costPriceStandard }),
            ...(input.salesPrice !== undefined && { SalesPrice: input.salesPrice })
        };

        // https://start.exactonline.fr/docs/services/Logistics/Items
        await nango.put({
            endpoint: `/api/v1/${currentDivision}/logistics/Items(guid'${encodeURIComponent(input.id)}')`,
            data: updateData,
            retries: 10
        });

        // https://start.exactonline.fr/docs/services/Logistics/Items
        const getResponse = await nango.get({
            endpoint: `/api/v1/${currentDivision}/logistics/Items(guid'${encodeURIComponent(input.id)}')`,
            retries: 3
        });

        const itemWrapper = ItemResponseSchema.parse(getResponse.data);
        const providerItem = ProviderItemSchema.parse(itemWrapper.d);

        return {
            ...(providerItem.ID != null && { id: providerItem.ID }),
            ...(providerItem.Code != null && { code: providerItem.Code }),
            ...(providerItem.Description != null && { description: providerItem.Description }),
            ...(providerItem.ExtraDescription != null && { extraDescription: providerItem.ExtraDescription }),
            ...(providerItem.ItemGroup != null && { itemGroup: providerItem.ItemGroup }),
            ...(providerItem.SalesVatCode != null && { salesVatCode: providerItem.SalesVatCode }),
            ...(providerItem.StartDate != null && { startDate: providerItem.StartDate }),
            ...(providerItem.Unit != null && { unit: providerItem.Unit }),
            ...(providerItem.IsSalesItem != null && { isSalesItem: providerItem.IsSalesItem }),
            ...(providerItem.IsPurchaseItem != null && { isPurchaseItem: providerItem.IsPurchaseItem }),
            ...(providerItem.IsStockItem != null && { isStockItem: providerItem.IsStockItem }),
            ...(providerItem.CostPriceStandard != null && { costPriceStandard: providerItem.CostPriceStandard }),
            ...(providerItem.SalesPrice != null && { salesPrice: providerItem.SalesPrice })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
