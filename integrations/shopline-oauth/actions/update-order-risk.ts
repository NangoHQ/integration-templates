import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        order_id: z.string().describe('The order ID containing the risk to update.'),
        risk_id: z.string().describe('The risk ID to update.'),
        recommendation: z.string().optional().describe('Risk recommendation. Examples: "accept", "cancel", "investigate".'),
        score: z.string().optional().describe('Risk score from 0 to 1.0. Example: "0.1".'),
        source: z.string().optional().describe('Risk source name. Example: "External".'),
        cause_cancel: z.boolean().optional().describe('Whether this risk should cause the order to be cancelled.'),
        display: z.boolean().optional().describe('Whether to display this risk on the order.'),
        risk_detail_msg_list: z.array(z.string()).optional().describe('List of risk detail messages.')
    })
    .describe('Input for updating an existing fraud risk assessment on an order.');

const RiskDetailMessageSchema = z.object({
    code: z.string().optional().describe('Risk detail message code.'),
    message: z.string().optional().describe('Risk detail message text.')
});

const ProviderRiskSchema = z.object({
    id: z.string(),
    order_id: z.string(),
    checkout_id: z.string().nullable().optional(),
    source: z.string(),
    score: z.string(),
    recommendation: z.string(),
    display: z.boolean(),
    cause_cancel: z.boolean(),
    risk_detail_msg_list: z.array(RiskDetailMessageSchema).optional(),
    message: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The risk ID.'),
        order_id: z.string().describe('The order ID this risk belongs to.'),
        checkout_id: z.string().nullable().optional().describe('The checkout ID associated with this risk, if any.'),
        source: z.string().describe('The risk source name.'),
        score: z.string().describe('The risk score.'),
        recommendation: z.string().describe('The risk recommendation.'),
        display: z.boolean().describe('Whether the risk is displayed on the order.'),
        cause_cancel: z.boolean().describe('Whether the risk causes order cancellation.'),
        risk_detail_msg_list: z.array(RiskDetailMessageSchema).optional().describe('List of risk detail messages.'),
        message: z.string().nullable().optional().describe('The risk message.'),
        created_at: z.string().optional().describe('The creation timestamp in ISO 8601 format.'),
        updated_at: z.string().optional().describe('The last update timestamp in ISO 8601 format.')
    })
    .describe('Output representing the updated fraud risk assessment.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing fraud risk assessment on an order.
 */
const action = createAction({
    description: 'Update an existing fraud risk assessment on an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/order/risk/update-order-risk
        const response = await nango.put({
            endpoint: `/admin/openapi/v20260601/orders/v2/${encodeURIComponent(input.order_id)}/risks/${encodeURIComponent(input.risk_id)}.json`,
            data: {
                risk: {
                    ...(input.recommendation !== undefined && { recommendation: input.recommendation }),
                    ...(input.score !== undefined && { score: input.score }),
                    ...(input.source !== undefined && { source: input.source }),
                    ...(input.cause_cancel !== undefined && { cause_cancel: input.cause_cancel }),
                    ...(input.display !== undefined && { display: input.display }),
                    ...(input.risk_detail_msg_list !== undefined && { risk_detail_msg_list: input.risk_detail_msg_list })
                }
            },
            retries: 3
        });

        const providerRisk = ProviderRiskSchema.parse(response.data.risk);

        return {
            id: providerRisk.id,
            order_id: providerRisk.order_id,
            ...(providerRisk.checkout_id !== undefined && { checkout_id: providerRisk.checkout_id }),
            source: providerRisk.source,
            score: providerRisk.score,
            recommendation: providerRisk.recommendation,
            display: providerRisk.display,
            cause_cancel: providerRisk.cause_cancel,
            ...(providerRisk.risk_detail_msg_list !== undefined && {
                risk_detail_msg_list: providerRisk.risk_detail_msg_list
            }),
            ...(providerRisk.message !== undefined && { message: providerRisk.message }),
            ...(providerRisk.created_at !== undefined && { created_at: providerRisk.created_at }),
            ...(providerRisk.updated_at !== undefined && { updated_at: providerRisk.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
