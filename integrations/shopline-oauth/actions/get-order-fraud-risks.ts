import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        order_id: z.string().describe('The unique identifier of the order whose fraud risks should be retrieved. Example: "21076844576373085746324631"')
    })
    .describe('Input to retrieve fraud risk assessments for a specific order.');

const RiskDetailMessageSchema = z.object({
    message: z.string().describe('Information about the fraud risk.'),
    risk_detail_level: z.string().describe('Level of the fraud risk detail. Valid values: cancel, investigate, accept, unknown.')
});

const RiskSchema = z.object({
    id: z.string().describe('Fraud risk ID.'),
    order_id: z.string().describe('Order ID associated with this risk.'),
    recommendation: z.string().describe('Fraud risk level recommendation. Valid values: cancel, investigate, accept.'),
    score: z.string().describe('Fraud risk score ranging from 0 to 1, where 1 indicates the highest risk level.'),
    source: z.string().describe('The identifier of the fraud risk resource. Valid values: Internal, External.'),
    cause_cancel: z.boolean().describe('Indicates whether to cancel the order.'),
    display: z.boolean().describe('Whether to display the risk warning indicator on the order detail page.'),
    checkout_id: z.string().optional().describe('The abandoned checkout ID associated with the order.'),
    risk_detail_msg_list: z.array(RiskDetailMessageSchema).optional().describe('A list of fraud risk detail messages.')
});

const OutputSchema = z
    .object({
        risks: z.array(RiskSchema).describe('A list of fraud risk assessments for the order.')
    })
    .describe('Output containing a list of fraud risk assessments for the requested order.');

/**
 * @tags: [read]
 * @tagReason: Reads the existing fraud risk assessments for a specific order from the provider.
 * @pitfalls: Orders without flagged risks return an empty or null risks array; checkout_id may be an empty string when no abandoned checkout is associated.
 */
const action = createAction({
    description: 'List fraud risk assessments for an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/order/order-management/get-fraud-risks-for-an-order
        const response = await nango.get({
            endpoint: `/admin/openapi/v20260601/orders/v2/${encodeURIComponent(input.order_id)}/risks.json`,
            retries: 3
        });

        const providerResponse = z
            .object({
                risks: z.array(z.unknown())
            })
            .parse(response.data);

        const risks = providerResponse.risks.map((item: unknown) => RiskSchema.parse(item));

        return {
            risks
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
