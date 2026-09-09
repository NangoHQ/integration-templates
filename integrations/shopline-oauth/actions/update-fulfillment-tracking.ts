import { z } from 'zod';
import { createAction } from 'nango';

const TrackingInfoInputSchema = z.object({
    tracking_number: z.string().describe('Tracking number for the shipment'),
    tracking_company: z.string().describe('Name of the shipping carrier'),
    tracking_url: z.string().optional().describe('URL to track the shipment')
});

const InputSchema = z
    .object({
        order_id: z.string().describe('ID of the order containing the fulfillment to update'),
        fulfillment_id: z.string().describe('ID of the fulfillment to update'),
        tracking_info_list: z
            .array(TrackingInfoInputSchema)
            .describe('New tracking information that will overwrite the existing tracking info on the fulfillment'),
        notify_customer: z.boolean().optional().describe('Whether to send a notification to the customer about the tracking update')
    })
    .describe('Input for updating fulfillment tracking information');

const ProviderTrackingInfoSchema = z.object({
    tracking_number: z.string(),
    tracking_company: z.string(),
    tracking_url: z.string().optional().nullable()
});

const ProviderFulfillmentSchema = z
    .object({
        id: z.string(),
        order_id: z.string(),
        status: z.string(),
        tracking_info_list: z.array(ProviderTrackingInfoSchema).optional().nullable(),
        created_at: z.string().optional().nullable(),
        updated_at: z.string().optional().nullable()
    })
    .passthrough();

const TrackingInfoOutputSchema = z.object({
    tracking_number: z.string().describe('Tracking number'),
    tracking_company: z.string().describe('Tracking company'),
    tracking_url: z.string().optional().describe('Tracking URL')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Fulfillment ID'),
        order_id: z.string().describe('Order ID'),
        status: z.string().describe('Fulfillment status'),
        tracking_info_list: z.array(TrackingInfoOutputSchema).optional().describe('Updated tracking information list'),
        created_at: z.string().optional().describe('Creation timestamp'),
        updated_at: z.string().optional().describe('Last update timestamp')
    })
    .describe('Updated fulfillment object');

/**
 * @tags: [write]
 * @tagReason: Overwrites tracking information on an existing fulfillment via a POST request.
 * @pitfalls: The tracking_info_list is a full overwrite, not a merge with existing tracking entries.
 */
const action = createAction({
    description: 'Update (overwrite) tracking info on an existing fulfillment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders', 'write_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/fulfillment/fulfillment/update-fulfillment-tracking
            endpoint: `/admin/openapi/v20260601/fulfillments/${encodeURIComponent(input.order_id)}/${encodeURIComponent(input.fulfillment_id)}/update_tracking.json`,
            data: {
                fulfillment: {
                    tracking_info_list: input.tracking_info_list,
                    ...(input.notify_customer !== undefined && { notify_customer: input.notify_customer })
                }
            },
            retries: 3
        });

        const fulfillment = ProviderFulfillmentSchema.parse(response.data.fulfillment || response.data);

        return {
            id: fulfillment.id,
            order_id: fulfillment.order_id,
            status: fulfillment.status,
            ...(fulfillment.tracking_info_list != null && {
                tracking_info_list: fulfillment.tracking_info_list.map((item) => ({
                    tracking_number: item.tracking_number,
                    tracking_company: item.tracking_company,
                    ...(item.tracking_url != null && { tracking_url: item.tracking_url })
                }))
            }),
            ...(fulfillment.created_at != null && { created_at: fulfillment.created_at }),
            ...(fulfillment.updated_at != null && { updated_at: fulfillment.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
