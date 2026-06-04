import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The global ID of the Shopify resource to remove tags from. Example: "gid://shopify/Customer/544365967"'),
    tags: z.array(z.string()).describe('The tags to remove from the resource. Example: ["tag1", "tag2"]')
});

const UserErrorSchema = z.object({
    message: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        tagsRemove: z.object({
            node: z
                .object({
                    id: z.string()
                })
                .nullable(),
            userErrors: z.array(UserErrorSchema)
        })
    })
});

const OutputSchema = z.object({
    id: z.string().describe('The global ID of the resource that was updated.'),
    user_errors: z.array(z.object({ message: z.string() })).describe('Any errors that occurred during the mutation.')
});

const action = createAction({
    description: 'Remove tags from a Shopify resource.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/tags-remove',
        group: 'Tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products', 'write_products', 'read_customers', 'write_customers', 'read_orders', 'write_orders', 'read_discounts', 'write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/tagsRemove
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `mutation removeTags($id: ID!, $tags: [String!]!) {
                    tagsRemove(id: $id, tags: $tags) {
                        node {
                            id
                        }
                        userErrors {
                            message
                        }
                    }
                }`,
                variables: {
                    id: input.id,
                    tags: input.tags
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The Shopify API returned an unexpected response format.',
                details: parsed.error.issues
            });
        }

        const result = parsed.data.data.tagsRemove;

        if (result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'mutation_error',
                message: result.userErrors.map((err) => err.message).join('; '),
                user_errors: result.userErrors
            });
        }

        if (!result.node) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Resource not found for id: ${input.id}`
            });
        }

        return {
            id: result.node.id,
            user_errors: []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
