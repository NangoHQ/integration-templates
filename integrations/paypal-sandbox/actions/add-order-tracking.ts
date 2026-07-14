import { z } from 'zod';
import { createAction } from 'nango';
import { randomUUID } from 'crypto';

const InputSchema = z.object({
    order_id: z.string().describe('The ID of the order to add tracking information to. Example: "8A79039013362943U"'),
    capture_id: z.string().describe('The ID of the capture for this order. Example: "3C679366HH908993F"'),
    tracking_number: z.string().describe('The tracking number for the shipment. Example: "443844607820"'),
    carrier: z.string().describe('The carrier for the shipment. Example: "FEDEX"'),
    status: z.string().describe('The status of the shipment. Example: "SHIPPED"'),
    request_id: z
        .string()
        .regex(/^[\x21-\x7E]{1,256}$/, 'request_id must be 1-256 printable ASCII characters.')
        .optional()
        .describe('Optional idempotency key sent as PayPal-Request-Id. If omitted, a random one is generated per execution.')
});

const LinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string()
});

const TrackerSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z.array(LinkSchema).optional()
});

const OutputSchema = z.object({
    order_id: z.string(),
    tracker_id: z.string().optional(),
    trackers: z.array(TrackerSchema).optional()
});

const action = createAction({
    description: 'Add shipment tracking information to a captured order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.paypal.com/api/orders/v2/#orders_track_create
            endpoint: `/v2/checkout/orders/${encodeURIComponent(input.order_id)}/track`,
            data: {
                capture_id: input.capture_id,
                tracking_number: input.tracking_number,
                carrier: input.carrier,
                status: input.status
            },
            headers: {
                // One idempotency key per execution so all internal retries resolve to the same tracker.
                'PayPal-Request-Id': input.request_id ?? randomUUID()
            },
            retries: 3
        });

        const orderData = z
            .object({
                id: z.string(),
                purchase_units: z
                    .array(
                        z.object({
                            shipping: z
                                .object({
                                    trackers: z.array(TrackerSchema).optional()
                                })
                                .optional()
                        })
                    )
                    .optional()
            })
            .parse(response.data);

        const trackers = orderData.purchase_units?.[0]?.shipping?.trackers;
        const trackerId = trackers?.[0]?.id;

        return {
            order_id: orderData.id,
            ...(trackerId !== undefined && { tracker_id: trackerId }),
            ...(trackers !== undefined && { trackers })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
