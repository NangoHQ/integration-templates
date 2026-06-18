import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fulfillmentOrderId: z
        .string()
        .describe('The ID of the fulfillment order for which to release the fulfillment hold. Example: "gid://shopify/FulfillmentOrder/564786110"'),
    externalId: z.string().optional().describe('A configurable ID used to track the automation system releasing this hold.'),
    holdIds: z
        .array(z.string())
        .optional()
        .describe('The IDs of the fulfillment holds to release. If not supplied, all holds for the fulfillment order will be released.')
});

const FulfillmentOrderSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    requestStatus: z.string().optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const OutputSchema = z.object({
    fulfillmentOrder: FulfillmentOrderSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Release a hold on a Shopify fulfillment order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_merchant_managed_fulfillment_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: {
            id: string;
            externalId?: string;
            holdIds?: string[];
        } = {
            id: input.fulfillmentOrderId
        };

        if (input.externalId !== undefined) {
            variables.externalId = input.externalId;
        }

        if (input.holdIds !== undefined) {
            variables.holdIds = input.holdIds;
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentOrderReleaseHold
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query: `
                    mutation fulfillmentOrderReleaseHold($id: ID!, $externalId: String, $holdIds: [ID!]) {
                        fulfillmentOrderReleaseHold(id: $id, externalId: $externalId, holdIds: $holdIds) {
                            fulfillmentOrder {
                                id
                                status
                                requestStatus
                            }
                            userErrors {
                                field
                                message
                                code
                            }
                        }
                    }
                `,
                variables
            },
            retries: 3
        });

        const data = z
            .object({
                data: z
                    .object({
                        fulfillmentOrderReleaseHold: z
                            .object({
                                fulfillmentOrder: FulfillmentOrderSchema.nullable().optional(),
                                userErrors: z.array(UserErrorSchema)
                            })
                            .nullable()
                            .optional()
                    })
                    .optional(),
                errors: z.array(z.object({ message: z.string() })).optional()
            })
            .parse(response.data);

        if (data.errors && data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: data.errors.map((err) => err.message).join(', ')
            });
        }

        const result = data.data?.fulfillmentOrderReleaseHold;

        if (!result) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Fulfillment order not found or could not be released.'
            });
        }

        if (result.userErrors.length > 0) {
            return {
                userErrors: result.userErrors
            };
        }

        if (!result.fulfillmentOrder) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Fulfillment order not found or could not be released.'
            });
        }

        return {
            fulfillmentOrder: {
                id: result.fulfillmentOrder.id,
                ...(result.fulfillmentOrder.status !== undefined && { status: result.fulfillmentOrder.status }),
                ...(result.fulfillmentOrder.requestStatus !== undefined && { requestStatus: result.fulfillmentOrder.requestStatus })
            },
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
