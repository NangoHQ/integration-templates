import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        order_id: z.string().describe('The order ID to add the risk flag to. Example: "21076844140332570828592858"'),
        recommendation: z.enum(['cancel', 'investigate', 'accept']).describe('The recommended action for this risk.'),
        score: z.string().describe('The risk score from 0.0 to 1.0 as a string. Example: "0.8"'),
        cause_cancel: z.boolean().describe('Whether this risk should cause the order to be cancelled.'),
        display: z.boolean().describe('Whether this risk should be displayed to the merchant.'),
        checkout_id: z.string().optional().describe('The checkout ID associated with this risk.'),
        risk_detail_msg_list: z.array(z.string()).optional().describe('Additional detail messages describing the risk.')
    })
    .describe('Input for adding a fraud risk flag to an order.');

const ProviderRiskSchema = z.object({
    id: z.string(),
    order_id: z.string(),
    recommendation: z.string(),
    score: z.string(),
    source: z.string().optional(),
    cause_cancel: z.boolean().optional(),
    display: z.boolean().optional(),
    checkout_id: z.string().optional().nullable(),
    risk_detail_msg_list: z.array(z.string()).optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique ID of the created risk.'),
        order_id: z.string().describe('The order ID the risk belongs to.'),
        recommendation: z.string().describe('The recommended action for this risk.'),
        score: z.string().describe('The risk score from 0.0 to 1.0.'),
        source: z.string().optional().describe('The source of the risk, typically "External".'),
        cause_cancel: z.boolean().optional().describe('Whether this risk should cause the order to be cancelled.'),
        display: z.boolean().optional().describe('Whether this risk is displayed to the merchant.'),
        checkout_id: z.string().optional().describe('The checkout ID associated with this risk.'),
        risk_detail_msg_list: z.array(z.string()).optional().describe('Detail messages describing the risk.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the risk was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the risk was last updated.')
    })
    .describe('Output of a created fraud risk flag on an order.');

/**
 * @tags: [write]
 * @tagReason: Creates a new fraud risk flag on an order.
 * @pitfalls: The `source` field is always hardcoded to `External` and cannot be customized by the caller.
 */
const action = createAction({
    description: 'Add a fraud risk flag to an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const riskPayload: Record<string, unknown> = {
            recommendation: input.recommendation,
            score: input.score,
            source: 'External',
            cause_cancel: input.cause_cancel,
            display: input.display
        };

        if (input.checkout_id !== undefined) {
            riskPayload['checkout_id'] = input.checkout_id;
        }

        if (input.risk_detail_msg_list !== undefined) {
            riskPayload['risk_detail_msg_list'] = input.risk_detail_msg_list;
        }

        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/orders/risks/add-order-risk
            endpoint: `/admin/openapi/v20260601/orders/v2/${encodeURIComponent(input.order_id)}/risks.json`,
            data: {
                risk: riskPayload
            },
            retries: 3
        });

        const parsed = ProviderRiskSchema.safeParse(response.data?.risk);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected risk response.',
                raw_response: response.data
            });
        }

        const risk = parsed.data;

        return {
            id: risk.id,
            order_id: risk.order_id,
            recommendation: risk.recommendation,
            score: risk.score,
            ...(risk.source !== undefined && { source: risk.source }),
            ...(risk.cause_cancel !== undefined && { cause_cancel: risk.cause_cancel }),
            ...(risk.display !== undefined && { display: risk.display }),
            ...(risk.checkout_id != null && { checkout_id: risk.checkout_id }),
            ...(risk.risk_detail_msg_list != null && { risk_detail_msg_list: risk.risk_detail_msg_list }),
            ...(risk.created_at !== undefined && { created_at: risk.created_at }),
            ...(risk.updated_at !== undefined && { updated_at: risk.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
