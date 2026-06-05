import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const FulfillmentOrderLineItemInputSchema = z.object({
    id: z.string().describe('The ID of the fulfillment order line item.'),
    quantity: z.number().int().describe('The quantity to fulfill.')
});

const FulfillmentOrderLineItemsInputSchema = z.object({
    fulfillmentOrderId: z.string().describe('The ID of the fulfillment order.'),
    fulfillmentOrderLineItems: z
        .array(FulfillmentOrderLineItemInputSchema)
        .optional()
        .describe('The line items to fulfill. If omitted, all line items are fulfilled.')
});

const FulfillmentTrackingInputSchema = z.object({
    company: z.string().optional().describe('The tracking company name.'),
    number: z.string().optional().describe('A single tracking number.'),
    numbers: z.array(z.string()).optional().describe('Multiple tracking numbers.'),
    url: z.string().optional().describe('A single tracking URL.'),
    urls: z.array(z.string()).optional().describe('Multiple tracking URLs.')
});

const FulfillmentOriginAddressInputSchema = z.object({
    address1: z.string().optional().describe('The street address of the fulfillment location.'),
    address2: z.string().optional().describe('The second line of the address.'),
    city: z.string().optional().describe('The city of the fulfillment location.'),
    countryCode: z.string().describe('The country code of the fulfillment location.'),
    provinceCode: z.string().optional().describe('The province code of the fulfillment location.'),
    zip: z.string().optional().describe('The zip code of the fulfillment location.')
});

const InputSchema = z.object({
    lineItemsByFulfillmentOrder: z.array(FulfillmentOrderLineItemsInputSchema).describe('Pairs of fulfillment order IDs and line items to fulfill.'),
    notifyCustomer: z.boolean().optional().describe('Whether to notify the customer. Defaults to false.'),
    originAddress: FulfillmentOriginAddressInputSchema.optional().describe('The origin address for tax purposes.'),
    trackingInfo: FulfillmentTrackingInputSchema.optional().describe('Tracking information for the fulfillment.')
});

const TrackingInfoSchema = z.object({
    company: z.string().nullable().optional(),
    number: z.string().nullable().optional(),
    url: z.string().nullable().optional()
});

const FulfillmentSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    totalQuantity: z.number().int().nullable().optional(),
    trackingInfo: z.array(TrackingInfoSchema).nullable().optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z.record(z.string(), z.unknown()).optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            fulfillmentCreate: z
                .object({
                    fulfillment: FulfillmentSchema.nullable().optional(),
                    userErrors: z.array(UserErrorSchema).optional()
                })
                .optional()
        })
        .nullable()
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    totalQuantity: z.number().int().optional(),
    trackingInfo: z.array(TrackingInfoSchema).optional()
});

const action = createAction({
    description: 'Create a fulfillment for fulfillable order line items.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-fulfillment',
        group: 'Fulfillments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_assigned_fulfillment_orders', 'write_merchant_managed_fulfillment_orders', 'write_third_party_fulfillment_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
                fulfillmentCreate(fulfillment: $fulfillment) {
                    fulfillment {
                        id
                        name
                        status
                        createdAt
                        updatedAt
                        totalQuantity
                        trackingInfo {
                            company
                            number
                            url
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            fulfillment: {
                lineItemsByFulfillmentOrder: input.lineItemsByFulfillmentOrder.map((item) => {
                    const lineItemInput: Record<string, unknown> = {
                        fulfillmentOrderId: item.fulfillmentOrderId
                    };
                    if (item.fulfillmentOrderLineItems !== undefined) {
                        lineItemInput['fulfillmentOrderLineItems'] = item.fulfillmentOrderLineItems;
                    }
                    return lineItemInput;
                }),
                ...(input.notifyCustomer !== undefined && { notifyCustomer: input.notifyCustomer }),
                ...(input.originAddress !== undefined && { originAddress: input.originAddress }),
                ...(input.trackingInfo !== undefined && { trackingInfo: input.trackingInfo })
            }
        };

        const config: Omit<ProxyConfiguration, 'method'> = {
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        };

        // https://shopify.dev/docs/api/admin-graphql/2025-04/mutations/fulfillmentCreate
        const response = await nango.post(config);

        const parsed = GraphQLResponseSchema.parse(response.data);

        if (parsed.errors != null && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((e) => e.message).join(', ')
            });
        }

        const result = parsed.data?.fulfillmentCreate;

        if (!result) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify: missing fulfillmentCreate payload.'
            });
        }

        if (result.userErrors && result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Shopify returned user errors while creating the fulfillment.',
                errors: result.userErrors
            });
        }

        const fulfillment = result.fulfillment;

        if (!fulfillment) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify: fulfillment was not returned.'
            });
        }

        return {
            id: fulfillment.id,
            ...(fulfillment.name != null && { name: fulfillment.name }),
            ...(fulfillment.status != null && { status: fulfillment.status }),
            ...(fulfillment.createdAt != null && { createdAt: fulfillment.createdAt }),
            ...(fulfillment.updatedAt != null && { updatedAt: fulfillment.updatedAt }),
            ...(fulfillment.totalQuantity != null && { totalQuantity: fulfillment.totalQuantity }),
            ...(fulfillment.trackingInfo != null && {
                trackingInfo: fulfillment.trackingInfo.map((info) => ({
                    ...(info.company != null && { company: info.company }),
                    ...(info.number != null && { number: info.number }),
                    ...(info.url != null && { url: info.url })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
