import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Product GID. Example: "gid://shopify/Product/123456789"'),
    title: z.string().optional(),
    descriptionHtml: z.string().optional(),
    vendor: z.string().optional(),
    productType: z.string().optional(),
    status: z.union([z.literal('ACTIVE'), z.literal('ARCHIVED'), z.literal('DRAFT')]).optional(),
    tags: z.array(z.string()).optional(),
    handle: z.string().optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    userErrors: z.array(UserErrorSchema)
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            productUpdate: z
                .object({
                    product: z
                        .object({
                            id: z.string().optional(),
                            title: z.string().optional()
                        })
                        .optional(),
                    userErrors: z.array(UserErrorSchema).optional()
                })
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z.unknown()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Update a Shopify product.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const productInput: Record<string, unknown> = {
            id: input.id
        };

        if (input['title'] !== undefined) {
            productInput['title'] = input['title'];
        }
        if (input['descriptionHtml'] !== undefined) {
            productInput['descriptionHtml'] = input['descriptionHtml'];
        }
        if (input['vendor'] !== undefined) {
            productInput['vendor'] = input['vendor'];
        }
        if (input['productType'] !== undefined) {
            productInput['productType'] = input['productType'];
        }
        if (input['status'] !== undefined) {
            productInput['status'] = input['status'];
        }
        if (input['tags'] !== undefined) {
            productInput['tags'] = input['tags'];
        }
        if (input['handle'] !== undefined) {
            productInput['handle'] = input['handle'];
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-10/mutations/productUpdate
            endpoint: 'admin/api/2025-10/graphql.json',
            data: {
                query: `
                    mutation UpdateProduct($product: ProductUpdateInput!) {
                        productUpdate(product: $product) {
                            product {
                                id
                                title
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    product: productInput
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((e) => e.message).join(', ')
            });
        }

        const productUpdate = parsed.data?.productUpdate;

        if (!productUpdate) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response structure from Shopify API'
            });
        }

        const userErrors = productUpdate.userErrors ?? [];
        const product = productUpdate.product;

        return {
            ...(product?.id !== undefined && { id: product.id }),
            ...(product?.title !== undefined && { title: product.title }),
            userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
