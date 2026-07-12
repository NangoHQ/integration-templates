import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    promotion_id: z.string().describe('Promotion ID. Example: "7834020607420"')
});

const PromotionTemplateValueSchema = z.object({
    amount: z.number().optional(),
    currency_code: z.string().optional(),
    custom_text: z.string().optional(),
    percent: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    promotion_title: z.string().optional(),
    promotion_type: z.string().optional(),
    status: z.string().optional(),
    discount_status: z.string().optional(),
    end_time: z.number().optional(),
    external_id: z.string().nullable().optional(),
    platform_type: z.string().optional(),
    promotion_code: z.string().optional(),
    promotion_custom_id: z.string().optional(),
    start_time: z.number().optional(),
    template_values: z.array(PromotionTemplateValueSchema).optional()
});

const action = createAction({
    description: 'Delete a Shopping ad promotion.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.pinterest.com/docs/api/v5/#operation/promotions/delete
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/promotions/${encodeURIComponent(input.promotion_id)}`,
            retries: 3
        });

        if (response.data) {
            const providerPromotion = OutputSchema.parse(response.data);
            return providerPromotion;
        }

        return {
            id: input.promotion_id,
            ad_account_id: input.ad_account_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
