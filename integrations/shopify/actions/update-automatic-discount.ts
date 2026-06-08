import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the automatic amount off discount to update. Example: "gid://shopify/DiscountAutomaticNode/123"'),
    automaticBasicDiscount: z.object({
        title: z.string().optional(),
        startsAt: z.string().optional(),
        endsAt: z.string().nullable().optional(),
        customerGets: z.record(z.string(), z.unknown()).optional(),
        minimumRequirement: z.record(z.string(), z.unknown()).optional(),
        combinesWith: z.record(z.string(), z.unknown()).optional(),
        recurringCycleLimit: z.number().optional(),
        tags: z.array(z.string()).optional(),
        context: z.record(z.string(), z.unknown()).optional()
    })
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        discountAutomaticBasicUpdate: z
            .object({
                automaticDiscountNode: z
                    .object({
                        id: z.string()
                    })
                    .nullable()
                    .optional(),
                userErrors: z.array(
                    z.object({
                        field: z.array(z.string()),
                        code: z.string().nullable(),
                        message: z.string()
                    })
                )
            })
            .nullable()
    }),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the updated automatic discount node.'),
    userErrors: z
        .array(
            z.object({
                field: z.array(z.string()),
                code: z.string().nullable(),
                message: z.string()
            })
        )
        .optional()
        .describe('List of user errors returned by Shopify.')
});

const action = createAction({
    description: 'Update an automatic basic Shopify discount.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-automatic-discount',
        group: 'Discounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation discountAutomaticBasicUpdate($id: ID!, $automaticBasicDiscount: DiscountAutomaticBasicInput!) {
                discountAutomaticBasicUpdate(id: $id, automaticBasicDiscount: $automaticBasicDiscount) {
                    automaticDiscountNode {
                        id
                    }
                    userErrors {
                        field
                        code
                        message
                    }
                }
            }
        `;

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/discountAutomaticBasicUpdate
            endpoint: '/admin/api/2026-01/graphql.json',
            method: 'POST',
            data: {
                query,
                variables: {
                    id: input.id,
                    automaticBasicDiscount: input.automaticBasicDiscount
                }
            },
            retries: 1
        };

        const response = await nango.post(config);

        const responseData = GraphQLResponseSchema.parse(response.data);

        if (responseData.errors && responseData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL execution error',
                errors: responseData.errors
            });
        }

        const result = responseData.data.discountAutomaticBasicUpdate;
        if (!result) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Shopify'
            });
        }

        if (result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'user_error',
                message: result.userErrors.map((e) => e.message).join(', '),
                userErrors: result.userErrors
            });
        }

        if (!result.automaticDiscountNode) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Discount not found'
            });
        }

        return {
            id: result.automaticDiscountNode.id,
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
