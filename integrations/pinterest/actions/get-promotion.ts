import { z } from 'zod';
import { createAction } from 'nango';

const PromotionTemplateValueSchema = z.object({
    amount: z.number().optional(),
    currency_code: z.string().optional(),
    custom_text: z.string().optional(),
    percent: z.number().optional()
});

const PromotionSchema = z.object({
    id: z.string().max(18),
    ad_account_id: z.string(),
    discount_status: z.string().optional(),
    end_time: z.number().optional(),
    external_id: z.string().optional().nullable(),
    platform_type: z.string().optional(),
    promotion_code: z.string().optional(),
    promotion_custom_id: z.string().optional(),
    promotion_title: z.string(),
    promotion_type: z.string(),
    start_time: z.number().optional(),
    status: z.string().optional(),
    template_values: z.array(PromotionTemplateValueSchema).optional()
});

const InputSchema = z.object({
    ad_account_id: z.string().describe('The Ad Account ID that the promotion belongs to. Example: "549770573673"'),
    promotion_id: z.string().describe('The Promotion ID to retrieve. Example: "123456789012"')
});

const action = createAction({
    description: 'Retrieve a Shopping ad promotion.',
    version: '1.0.0',
    input: InputSchema,
    output: PromotionSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof PromotionSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/promotions-get/
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/promotions/${encodeURIComponent(input.promotion_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Promotion not found',
                ad_account_id: input.ad_account_id,
                promotion_id: input.promotion_id
            });
        }

        const promotion = PromotionSchema.parse(response.data);

        return {
            id: promotion.id,
            ad_account_id: promotion.ad_account_id,
            ...(promotion.discount_status !== undefined && { discount_status: promotion.discount_status }),
            ...(promotion.end_time !== undefined && { end_time: promotion.end_time }),
            ...(promotion.external_id !== undefined && promotion.external_id !== null && { external_id: promotion.external_id }),
            ...(promotion.platform_type !== undefined && { platform_type: promotion.platform_type }),
            ...(promotion.promotion_code !== undefined && { promotion_code: promotion.promotion_code }),
            ...(promotion.promotion_custom_id !== undefined && { promotion_custom_id: promotion.promotion_custom_id }),
            promotion_title: promotion.promotion_title,
            promotion_type: promotion.promotion_type,
            ...(promotion.start_time !== undefined && { start_time: promotion.start_time }),
            ...(promotion.status !== undefined && { status: promotion.status }),
            ...(promotion.template_values !== undefined && { template_values: promotion.template_values })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
