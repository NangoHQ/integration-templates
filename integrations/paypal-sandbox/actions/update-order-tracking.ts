import { z } from 'zod';
import { createAction } from 'nango';

const PatchSchema = z.object({
    op: z.enum(['replace', 'add', 'remove']),
    path: z.string(),
    value: z.unknown().optional()
});

const InputSchema = z.object({
    order_id: z.string().describe('PayPal order ID. Example: "8A79039013362943U"'),
    tracker_id: z.string().describe('PayPal tracker ID. Example: "9YE45958FJ858840B-TRACK555999888"'),
    patches: z
        .array(PatchSchema)
        .describe(
            'JSON Patch operations to apply to the tracker. Supported paths include /status (replace to CANCELLED), /notify_payer (replace or add), and /items (replace).'
        )
});

const TrackerItemSchema = z
    .object({
        name: z.string().optional(),
        sku: z.string().optional(),
        quantity: z.string().optional()
    })
    .passthrough();

const TrackerSchema = z
    .object({
        id: z.string(),
        status: z.string().optional(),
        notify_payer: z.boolean().optional(),
        items: z.array(TrackerItemSchema).optional(),
        create_time: z.string().optional(),
        update_time: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    order_id: z.string(),
    tracker: z.object({
        id: z.string(),
        status: z.string().optional(),
        notify_payer: z.boolean().optional(),
        items: z.array(TrackerItemSchema).optional(),
        create_time: z.string().optional(),
        update_time: z.string().optional()
    })
});

const action = createAction({
    description: 'Update an existing tracking record on a PayPal order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/payments/orders/client_sdk_orders_api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.paypal.com/api/orders/v2/#orders_trackers_patch
        await nango.patch({
            endpoint: `/v2/checkout/orders/${encodeURIComponent(input.order_id)}/trackers/${encodeURIComponent(input.tracker_id)}`,
            data: input.patches,
            retries: 3
        });

        // https://developer.paypal.com/api/orders/v2/#orders_get
        const response = await nango.get({
            endpoint: `/v2/checkout/orders/${encodeURIComponent(input.order_id)}`,
            retries: 3
        });

        const order = z
            .object({
                purchase_units: z
                    .array(
                        z
                            .object({
                                shipping: z
                                    .object({
                                        trackers: z.array(z.unknown()).optional()
                                    })
                                    .optional()
                            })
                            .passthrough()
                    )
                    .optional()
            })
            .passthrough()
            .parse(response.data);

        let tracker: z.infer<typeof TrackerSchema> | undefined;
        for (const unit of order.purchase_units || []) {
            for (const t of unit.shipping?.trackers || []) {
                const parsed = TrackerSchema.safeParse(t);
                if (parsed.success && parsed.data.id === input.tracker_id) {
                    tracker = parsed.data;
                    break;
                }
            }
            if (tracker) {
                break;
            }
        }

        if (!tracker) {
            throw new nango.ActionError({
                type: 'tracker_not_found',
                message: `Tracker ${input.tracker_id} not found on order ${input.order_id} after update.`
            });
        }

        return {
            order_id: input.order_id,
            tracker: {
                id: tracker.id,
                ...(tracker.status !== undefined && { status: tracker.status }),
                ...(tracker.notify_payer !== undefined && { notify_payer: tracker.notify_payer }),
                ...(tracker.items !== undefined && { items: tracker.items }),
                ...(tracker.create_time !== undefined && { create_time: tracker.create_time }),
                ...(tracker.update_time !== undefined && { update_time: tracker.update_time })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
