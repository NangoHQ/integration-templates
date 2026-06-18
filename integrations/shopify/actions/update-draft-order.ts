import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The draft order ID. Example: gid://shopify/DraftOrder/1234567890'),
    input: z.record(z.string(), z.unknown()).describe('Partial DraftOrderInput fields to update')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const DraftOrderSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional()
});

const DraftOrderUpdatePayloadSchema = z.object({
    draftOrderUpdate: z
        .object({
            draftOrder: DraftOrderSchema.nullable().optional(),
            userErrors: z.array(UserErrorSchema).optional()
        })
        .nullable()
        .optional()
});

const GraphQLResponseSchema = z.object({
    data: DraftOrderUpdatePayloadSchema.nullable().optional(),
    errors: z.array(z.record(z.string(), z.unknown())).optional()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    userErrors: z.array(UserErrorSchema).optional()
});

const action = createAction({
    description: 'Update a Shopify draft order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_draft_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation draftOrderUpdate($id: ID!, $input: DraftOrderInput!) {
                draftOrderUpdate(id: $id, input: $input) {
                    draftOrder {
                        id
                        name
                        status
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
            input: input.input
        };

        // https://shopify.dev/docs/api/admin-graphql/2025-04/mutations/draftOrderUpdate
        const response = await nango.post({
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query,
                variables
            },
            headers: {
                'Content-Type': 'application/json'
            },
            retries: 3
        });

        const graphqlResponse = GraphQLResponseSchema.safeParse(response.data);
        if (!graphqlResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse GraphQL response',
                errors: graphqlResponse.error.issues
            });
        }

        if (graphqlResponse.data.errors && graphqlResponse.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL returned errors',
                errors: graphqlResponse.data.errors
            });
        }

        const payload = graphqlResponse.data.data;
        if (!payload) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Draft order update response was empty'
            });
        }

        const draftOrderUpdate = payload.draftOrderUpdate;
        if (!draftOrderUpdate) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Draft order update data was not found in the response'
            });
        }

        const userErrors = draftOrderUpdate.userErrors ?? [];
        if (userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'user_errors',
                message: 'Shopify returned user errors while updating the draft order',
                userErrors: userErrors
            });
        }

        const draftOrder = draftOrderUpdate.draftOrder;
        if (!draftOrder) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Updated draft order was not found in the response'
            });
        }

        return {
            id: draftOrder.id,
            name: draftOrder.name,
            status: draftOrder.status,
            userErrors: userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
