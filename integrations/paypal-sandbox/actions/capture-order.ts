import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.string().describe('Order ID. Example: "8A79039013362943U"')
});

const ProviderCaptureAmountSchema = z
    .object({
        currency_code: z.string().optional(),
        value: z.string().optional()
    })
    .passthrough();

const ProviderCaptureSchema = z
    .object({
        id: z.string().optional(),
        status: z.string().optional(),
        amount: ProviderCaptureAmountSchema.optional(),
        create_time: z.string().optional(),
        update_time: z.string().optional()
    })
    .passthrough();

const ProviderPaymentsSchema = z
    .object({
        captures: z.array(ProviderCaptureSchema).optional()
    })
    .passthrough();

const ProviderPurchaseUnitSchema = z
    .object({
        reference_id: z.string().optional(),
        amount: ProviderCaptureAmountSchema.optional(),
        payments: ProviderPaymentsSchema.optional()
    })
    .passthrough();

const ProviderLinkSchema = z
    .object({
        href: z.string(),
        rel: z.string(),
        method: z.string().optional()
    })
    .passthrough();

const ProviderOrderSchema = z
    .object({
        id: z.string(),
        status: z.string(),
        intent: z.string().optional(),
        create_time: z.string().optional(),
        update_time: z.string().optional(),
        purchase_units: z.array(ProviderPurchaseUnitSchema).optional(),
        links: z.array(ProviderLinkSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    intent: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    purchase_units: z.array(ProviderPurchaseUnitSchema).optional(),
    links: z.array(ProviderLinkSchema).optional()
});

const action = createAction({
    description: 'Capture an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.paypal.com/api/orders/v2/#orders_capture
            endpoint: `/v2/checkout/orders/${encodeURIComponent(input.order_id)}/capture`,
            retries: 3
        });

        const order = ProviderOrderSchema.parse(response.data);

        return {
            id: order.id,
            status: order.status,
            ...(order.intent !== undefined && { intent: order.intent }),
            ...(order.create_time !== undefined && { create_time: order.create_time }),
            ...(order.update_time !== undefined && { update_time: order.update_time }),
            ...(order.purchase_units !== undefined && { purchase_units: order.purchase_units }),
            ...(order.links !== undefined && { links: order.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
