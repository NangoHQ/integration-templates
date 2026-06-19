import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The Shopify global ID of the resource to add tags to. Example: "gid://shopify/Product/20995642"'),
    tags: z.union([z.string(), z.array(z.string())]).describe('Tags to add. Can be a single string (comma-separated) or an array of strings.')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        tagsAdd: z.object({
            node: z
                .object({
                    id: z.string()
                })
                .nullable()
                .optional(),
            userErrors: z.array(
                z.object({
                    field: z.array(z.string()).optional(),
                    message: z.string()
                })
            )
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    tags_added: z.array(z.string())
});

const action = createAction({
    description: 'Add tags to a Shopify resource.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products', 'write_customers', 'write_orders', 'write_draft_orders', 'write_content', 'write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tags =
            typeof input.tags === 'string'
                ? input.tags
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                : input.tags;

        if (tags.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one tag is required.'
            });
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/tagsAdd
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `mutation addTags($id: ID!, $tags: [String!]!) {
                    tagsAdd(id: $id, tags: $tags) {
                        node {
                            id
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }`,
                variables: {
                    id: input.id,
                    tags: tags
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const payload = providerResponse.data.tagsAdd;

        if (payload.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: payload.userErrors.map((err) => err.message).join(', '),
                user_errors: payload.userErrors.map((err) => ({
                    field: err.field?.join('.') ?? '',
                    message: err.message
                }))
            });
        }

        if (!payload.node) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Resource not found or does not support tagging.'
            });
        }

        return {
            id: payload.node.id,
            tags_added: tags
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
