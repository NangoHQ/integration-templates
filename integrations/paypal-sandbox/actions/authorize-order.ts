import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.string().describe('PayPal order ID. Example: "8A79039013362943U"')
});

const LinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string().optional()
});

const MoneySchema = z.object({
    currency_code: z.string(),
    value: z.string()
});

const AuthorizationSchema = z.object({
    id: z.string(),
    status: z.string(),
    amount: MoneySchema.optional()
});

const PurchaseUnitSchema = z.object({
    reference_id: z.string().optional(),
    payments: z
        .object({
            authorizations: z.array(AuthorizationSchema).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    intent: z.string().optional(),
    purchase_units: z.array(PurchaseUnitSchema).optional(),
    links: z.array(LinkSchema).optional()
});

const action = createAction({
    description: 'Authorize an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.paypal.com/api/rest/
            endpoint: `/v2/checkout/orders/${encodeURIComponent(input.order_id)}/authorize`,
            retries: 1
        });

        const order = OutputSchema.parse(response.data);

        return {
            id: order.id,
            status: order.status,
            ...(order.intent !== undefined && { intent: order.intent }),
            ...(order.purchase_units !== undefined && { purchase_units: order.purchase_units }),
            ...(order.links !== undefined && { links: order.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
