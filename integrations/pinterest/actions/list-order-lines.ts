import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    cursor: z.string().optional().describe('Pagination cursor (bookmark) from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(250).optional().describe('Maximum number of items to include in a single page. Default: 25, Maximum: 250.')
});

const ProviderOrderLineSchema = z.object({
    ad_account_id: z.string(),
    budget: z.number().nullable().optional(),
    campaign_ids: z.array(z.string()),
    end_time: z.number().nullable().optional(),
    id: z.string(),
    name: z.string().nullable().optional(),
    paid_budget: z.number().nullable().optional(),
    paid_type: z.string().nullable().optional(),
    purchase_order_id: z.string().nullable().optional(),
    start_time: z.number(),
    status: z.string(),
    type: z.string()
});

const OrderLineSchema = z.object({
    ad_account_id: z.string(),
    budget: z.number().optional(),
    campaign_ids: z.array(z.string()),
    end_time: z.number().optional(),
    id: z.string(),
    name: z.string().optional(),
    paid_budget: z.number().optional(),
    paid_type: z.string().optional(),
    purchase_order_id: z.string().optional(),
    start_time: z.number(),
    status: z.string(),
    type: z.string()
});

const OutputSchema = z.object({
    items: z.array(OrderLineSchema),
    next_bookmark: z.string().optional()
});

const action = createAction({
    description: 'List insertion-order line items billed to the ad account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/order_lines/list
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/order_lines`,
            params: {
                ...(input.cursor && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        });

        const ProviderListResponseSchema = z.object({
            items: z.array(ProviderOrderLineSchema),
            bookmark: z.string().nullable().optional()
        });

        const parsed = ProviderListResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Pinterest API',
                details: parsed.error.message
            });
        }

        const data = parsed.data;

        return {
            items: data.items.map((item) => ({
                ad_account_id: item.ad_account_id,
                ...(item.budget != null && { budget: item.budget }),
                campaign_ids: item.campaign_ids,
                ...(item.end_time != null && { end_time: item.end_time }),
                id: item.id,
                ...(item.name != null && { name: item.name }),
                ...(item.paid_budget != null && { paid_budget: item.paid_budget }),
                ...(item.paid_type != null && { paid_type: item.paid_type }),
                ...(item.purchase_order_id != null && { purchase_order_id: item.purchase_order_id }),
                start_time: item.start_time,
                status: item.status,
                type: item.type
            })),
            ...(data.bookmark != null && { next_bookmark: data.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
