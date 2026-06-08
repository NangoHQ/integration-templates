import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the fulfillment order associated with the fulfillment request. Example: "gid://shopify/FulfillmentOrder/1046000778"'),
    message: z.string().optional().describe('An optional reason for accepting the fulfillment request.')
});

const FulfillmentOrderSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    requestStatus: z.string().optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    fulfillmentOrder: FulfillmentOrderSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

function isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const action = createAction({
    description: 'Accept a fulfillment request for a Shopify fulfillment order.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/accept-fulfillment-request',
        group: 'Fulfillment Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_assigned_fulfillment_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation fulfillmentOrderAcceptFulfillmentRequest($id: ID!, $message: String) {
                fulfillmentOrderAcceptFulfillmentRequest(id: $id, message: $message) {
                    fulfillmentOrder {
                        id
                        status
                        requestStatus
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            id: input.id,
            ...(input.message !== undefined && { message: input.message })
        };

        // https://shopify.dev/docs/api/admin-graphql/2025-04/mutations/fulfillmentOrderAcceptFulfillmentRequest
        const response = await nango.post({
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query,
                variables
            },
            retries: 10
        });

        const data = response.data;

        if (!isObject(data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Shopify API'
            });
        }

        const mutationPayload = data['data'];
        if (!isObject(mutationPayload)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response payload from Shopify API'
            });
        }

        const result = mutationPayload['fulfillmentOrderAcceptFulfillmentRequest'];
        if (!isObject(result)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing fulfillmentOrderAcceptFulfillmentRequest in response'
            });
        }

        const userErrorsRaw = result['userErrors'];
        const userErrors = z.array(UserErrorSchema).parse(userErrorsRaw);

        const fulfillmentOrderRaw = result['fulfillmentOrder'];
        const fulfillmentOrder =
            fulfillmentOrderRaw !== undefined && fulfillmentOrderRaw !== null ? FulfillmentOrderSchema.parse(fulfillmentOrderRaw) : undefined;

        return {
            ...(fulfillmentOrder !== undefined && { fulfillmentOrder }),
            userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
