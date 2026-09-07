import { z } from 'zod';
import { createAction } from 'nango';

const TrackingInfoSchema = z.object({
    tracking_company: z.string().describe('Name of the shipping carrier. Example: "FedEx"'),
    tracking_number: z.string().describe('The tracking number provided by the carrier. Example: "1234567890"'),
    tracking_url: z.string().describe('URL where the shipment can be tracked. Example: "https://www.fedex.com/apps/fedextrack/?tracknumbers=1234567890"')
});

const LineItemSchema = z.object({
    id: z.string().describe('The ID of the order line item to fulfill. This is the order-level line item id, not the product variant id.'),
    quantity: z.number().describe('The quantity of the line item to fulfill.')
});

const InputSchema = z
    .object({
        order_id: z.string().describe('The ID of the order to fulfill. Example: "21076844140332570828592858"'),
        line_items: z
            .array(LineItemSchema)
            .describe('The order line items to fulfill. Each entry must use the order line item id, not the product variant id.'),
        tracking_info_list: z.array(TrackingInfoSchema).max(10).optional().describe('Up to 10 tracking info objects for the shipment.'),
        notify_customer: z.boolean().optional().describe('Whether to send a shipment notification email to the customer.')
    })
    .describe('Input for creating a fulfillment on an order');

const ProviderLineItemSchema = z.object({
    id: z.union([z.string(), z.number()]),
    fulfillment_quantity: z.number().optional()
});

const ProviderTrackingInfoSchema = z.object({
    tracking_company: z.string().optional(),
    tracking_number: z.string().optional(),
    tracking_url: z.string().optional()
});

const ProviderFulfillmentSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
    status: z.string().optional(),
    line_items: z.array(ProviderLineItemSchema).optional(),
    tracking_info_list: z.array(ProviderTrackingInfoSchema).optional()
});

const ProviderResponseSchema = z.object({
    fulfillment: ProviderFulfillmentSchema
});

const OutputLineItemSchema = z.object({
    id: z.string().describe('The order line item ID that was fulfilled.'),
    fulfillment_quantity: z.number().optional().describe('The quantity of the line item that was fulfilled.')
});

const OutputTrackingInfoSchema = z.object({
    tracking_company: z.string().optional().describe('The shipping carrier name.'),
    tracking_number: z.string().optional().describe('The tracking number.'),
    tracking_url: z.string().optional().describe('The tracking URL.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the created fulfillment.'),
        name: z.string().optional().describe('The display name of the fulfillment, e.g. "#1001.1".'),
        status: z.string().optional().describe('The status of the fulfillment, e.g. "success".'),
        line_items: z.array(OutputLineItemSchema).optional().describe('The order line items that were fulfilled.'),
        tracking_info_list: z.array(OutputTrackingInfoSchema).optional().describe('The tracking information attached to the fulfillment.')
    })
    .describe('The created fulfillment');

/**
 * @tags: [write]
 * @tagReason: Creates a new fulfillment record on the provider order.
 * @pitfalls: line_items[].id must be the order-level line item id, not the product variant id, and the provider accepts at most 10 tracking_info_list entries.
 */
const action = createAction({
    description: "Create a fulfillment for an order's line items, with optional tracking info.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            fulfillment: {
                line_items: input.line_items,
                ...(input.tracking_info_list !== undefined && { tracking_info_list: input.tracking_info_list }),
                ...(input.notify_customer !== undefined && { notify_customer: input.notify_customer })
            }
        };

        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/orders/fulfillments/Create-a-fulfillment
            endpoint: `/admin/openapi/v20260601/orders/${encodeURIComponent(input.order_id)}/fulfillments.json`,
            data: payload,
            retries: 10
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const fulfillment = parsed.fulfillment;

        return {
            id: String(fulfillment.id),
            ...(fulfillment.name !== undefined && { name: fulfillment.name }),
            ...(fulfillment.status !== undefined && { status: fulfillment.status }),
            ...(fulfillment.line_items !== undefined && {
                line_items: fulfillment.line_items.map((item) => ({
                    id: String(item.id),
                    ...(item.fulfillment_quantity !== undefined && { fulfillment_quantity: item.fulfillment_quantity })
                }))
            }),
            ...(fulfillment.tracking_info_list !== undefined && {
                tracking_info_list: fulfillment.tracking_info_list.map((info) => ({
                    ...(info.tracking_company !== undefined && { tracking_company: info.tracking_company }),
                    ...(info.tracking_number !== undefined && { tracking_number: info.tracking_number }),
                    ...(info.tracking_url !== undefined && { tracking_url: info.tracking_url })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
