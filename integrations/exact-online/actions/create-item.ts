import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    code: z.string().describe('Item code. Example: "NEW-ITEM-001"'),
    description: z.string().describe('Item description. Example: "New product item"'),
    itemGroup: z.string().describe('Item group GUID. Example: "e54a5a52-21b7-4ce5-80ed-976b2100c02b"'),
    isSalesItem: z.boolean().optional().describe('Whether this item is a sales item.'),
    isPurchaseItem: z.boolean().optional().describe('Whether this item is a purchase item.'),
    costPriceStandard: z.number().optional().describe('Standard cost price. Example: 10.5'),
    salesVatCode: z.string().optional().describe('Sales VAT code. Example: "VN"')
});

const MeResponseSchema = z.object({
    d: z.union([
        z.object({
            CurrentDivision: z.union([z.number(), z.string()])
        }),
        z.object({
            results: z
                .array(
                    z.object({
                        CurrentDivision: z.union([z.number(), z.string()])
                    })
                )
                .min(1)
        })
    ])
});

const PostResponseSchema = z.object({
    d: z
        .object({
            __metadata: z.object({
                uri: z.string()
            })
        })
        .passthrough()
});

const GetItemResponseSchema = z.object({
    d: z
        .object({
            ID: z.string(),
            Code: z.string().nullable().optional(),
            Description: z.string().nullable().optional(),
            ItemGroup: z.string().nullable().optional(),
            IsSalesItem: z.boolean().nullable().optional(),
            IsPurchaseItem: z.boolean().nullable().optional(),
            CostPriceStandard: z.number().nullable().optional(),
            SalesVatCode: z.string().nullable().optional()
        })
        .passthrough()
});

const OutputSchema = z.object({
    id: z.string(),
    code: z.string().optional(),
    description: z.string().optional(),
    itemGroup: z.string().optional(),
    isSalesItem: z.boolean().optional(),
    isPurchaseItem: z.boolean().optional(),
    costPriceStandard: z.number().optional(),
    salesVatCode: z.string().optional()
});

const action = createAction({
    description: 'Create a new item/product',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Items'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-rest-api-me
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            params: {
                $select: 'CurrentDivision'
            },
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        let division: number | string;
        if ('CurrentDivision' in meData.d) {
            division = meData.d.CurrentDivision;
        } else {
            const first = meData.d.results[0];
            if (!first) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Me endpoint returned empty results array.'
                });
            }
            division = first.CurrentDivision;
        }

        const postData: Record<string, unknown> = {
            Code: input.code,
            Description: input.description,
            ItemGroup: input.itemGroup
        };

        if (input.isSalesItem !== undefined) {
            postData['IsSalesItem'] = input.isSalesItem;
        }
        if (input.isPurchaseItem !== undefined) {
            postData['IsPurchaseItem'] = input.isPurchaseItem;
        }
        if (input.costPriceStandard !== undefined) {
            postData['CostPriceStandard'] = input.costPriceStandard;
        }
        if (input.salesVatCode !== undefined) {
            postData['SalesVatCode'] = input.salesVatCode;
        }

        // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails.aspx?name=LogisticsItems
        const createResponse = await nango.post({
            endpoint: `/api/v1/${encodeURIComponent(division)}/logistics/Items`,
            data: postData,
            retries: 1
        });

        const createData = PostResponseSchema.parse(createResponse.data);
        const metadataUri = createData.d.__metadata.uri;

        const match = metadataUri.match(/Items\(guid'([^']+)'\)/);
        const itemId = match ? match[1] : null;

        if (!itemId) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Could not extract item ID from create response metadata URI.'
            });
        }

        // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails.aspx?name=LogisticsItems
        const getResponse = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(division)}/logistics/Items(guid'${encodeURIComponent(itemId)}')`,
            retries: 3
        });

        const itemData = GetItemResponseSchema.parse(getResponse.data);
        const item = itemData.d;

        return {
            id: item.ID,
            ...(item.Code != null && { code: item.Code }),
            ...(item.Description != null && { description: item.Description }),
            ...(item.ItemGroup != null && { itemGroup: item.ItemGroup }),
            ...(item.IsSalesItem != null && { isSalesItem: item.IsSalesItem }),
            ...(item.IsPurchaseItem != null && { isPurchaseItem: item.IsPurchaseItem }),
            ...(item.CostPriceStandard != null && { costPriceStandard: item.CostPriceStandard }),
            ...(item.SalesVatCode != null && { salesVatCode: item.SalesVatCode })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
