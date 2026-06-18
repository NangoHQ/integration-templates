import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GraphQL ID of the fulfillment. Example: "gid://shopify/Fulfillment/1234567890"')
});

const TrackingInfoSchema = z.object({
    company: z.string().nullable().optional(),
    number: z.string().nullable().optional(),
    url: z.string().nullable().optional()
});

const ServiceSchema = z.object({
    handle: z.string().nullable().optional(),
    serviceName: z.string().nullable().optional()
});

const LineItemVariantSchema = z.object({
    id: z.string().nullable().optional(),
    title: z.string().nullable().optional()
});

const LineItemSchema = z.object({
    id: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    variant: LineItemVariantSchema.nullable().optional()
});

const FulfillmentLineItemSchema = z.object({
    id: z.string(),
    lineItem: LineItemSchema.nullable().optional(),
    quantity: z.number().nullable().optional()
});

const OrderSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    legacyResourceId: z.string().nullable().optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            fulfillment: z
                .object({
                    id: z.string(),
                    status: z.string(),
                    trackingInfo: z.array(TrackingInfoSchema).nullable().optional(),
                    service: ServiceSchema.nullable().optional(),
                    fulfillmentLineItems: z
                        .object({
                            edges: z
                                .array(
                                    z.object({
                                        node: FulfillmentLineItemSchema
                                    })
                                )
                                .optional()
                        })
                        .nullable()
                        .optional(),
                    order: OrderSchema.nullable().optional()
                })
                .nullable()
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    trackingInfo: z.array(TrackingInfoSchema).optional(),
    service: ServiceSchema.optional(),
    fulfillmentLineItems: z.array(FulfillmentLineItemSchema).optional(),
    order: OrderSchema.optional()
});

const action = createAction({
    description: 'Retrieve a Shopify fulfillment by GraphQL ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query GetFulfillment($id: ID!) {
                fulfillment(id: $id) {
                    id
                    status
                    trackingInfo(first: 10) {
                        company
                        number
                        url
                    }
                    service {
                        handle
                        serviceName
                    }
                    fulfillmentLineItems(first: 10) {
                        edges {
                            node {
                                id
                                lineItem {
                                    id
                                    title
                                    variant {
                                        id
                                        title
                                    }
                                }
                                quantity
                            }
                        }
                    }
                    order {
                        id
                        name
                        legacyResourceId
                    }
                }
            }
        `;

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-04/queries/fulfillment
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Shopify GraphQL API'
            });
        }

        const parsed = GraphQLResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Shopify GraphQL API returned errors',
                errors: parsed.errors
            });
        }

        if (!parsed.data) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Shopify GraphQL API response missing data field'
            });
        }

        const fulfillment = parsed.data.fulfillment;

        if (!fulfillment) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Fulfillment not found for id: ${input.id}`
            });
        }

        return {
            id: fulfillment.id,
            status: fulfillment.status,
            ...(fulfillment.trackingInfo != null && { trackingInfo: fulfillment.trackingInfo }),
            ...(fulfillment.service != null && { service: fulfillment.service }),
            ...(fulfillment.fulfillmentLineItems != null && {
                fulfillmentLineItems: fulfillment.fulfillmentLineItems.edges?.map((edge) => edge.node) ?? []
            }),
            ...(fulfillment.order != null && { order: fulfillment.order })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
