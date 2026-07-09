import { z } from 'zod';
import { createAction } from 'nango';

const PromotionTemplateValueSchema = z.object({
    amount: z.number().optional(),
    currency_code: z.string().optional(),
    custom_text: z.string().optional(),
    percent: z.number().optional()
});

const PromotionSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    promotion_title: z.string(),
    promotion_type: z.string(),
    discount_status: z.string().optional(),
    end_time: z.number().optional(),
    external_id: z.string().nullable().optional(),
    platform_type: z.string().optional(),
    promotion_code: z.string().optional(),
    promotion_custom_id: z.string().optional(),
    start_time: z.number().optional(),
    status: z.string().optional(),
    template_values: z.array(PromotionTemplateValueSchema).optional()
});

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    bookmark: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().optional().describe('Maximum number of items to return per page. Default: 25, Maximum: 250.')
});

const OutputSchema = z.object({
    items: z.array(PromotionSchema),
    bookmark: z.string().optional()
});

const action = createAction({
    description: 'List Shopping ad promotions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/promotions/list
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/promotions`,
            params: {
                ...(input.bookmark !== undefined && { bookmark: input.bookmark }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) })
            },
            retries: 3
        });

        const raw = z
            .object({
                bookmark: z.string().nullable().optional(),
                items: z.array(z.unknown())
            })
            .parse(response.data);

        const items = raw.items.map((item) => PromotionSchema.parse(item));

        return {
            items,
            ...(raw.bookmark != null && { bookmark: raw.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
