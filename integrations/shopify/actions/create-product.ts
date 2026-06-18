import { z } from 'zod';
import { createAction } from 'nango';

const SeoInputSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional()
});

const ProductOptionInputSchema = z.object({
    name: z.string(),
    values: z.array(
        z.object({
            name: z.string()
        })
    )
});

const InputSchema = z.object({
    title: z.string(),
    descriptionHtml: z.string().optional(),
    vendor: z.string().optional(),
    productType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT']).optional(),
    handle: z.string().optional(),
    seo: SeoInputSchema.optional(),
    productOptions: z.array(ProductOptionInputSchema).optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()),
    message: z.string()
});

const SeoResponseSchema = z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional()
});

const ProductSchema = z.object({
    id: z.string(),
    title: z.string(),
    handle: z.string().nullable().optional(),
    descriptionHtml: z.string().nullable().optional(),
    productType: z.string().nullable().optional(),
    vendor: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    seo: SeoResponseSchema.optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            productCreate: z
                .object({
                    product: ProductSchema.nullable().optional(),
                    userErrors: z.array(UserErrorSchema).nullable().optional()
                })
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    handle: z.string().optional(),
    descriptionHtml: z.string().optional(),
    productType: z.string().optional(),
    vendor: z.string().optional(),
    status: z.string().optional(),
    tags: z.array(z.string()).optional(),
    seo: z
        .object({
            title: z.string().optional(),
            description: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a Shopify product.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables = {
            product: {
                title: input.title,
                ...(input.descriptionHtml !== undefined && { descriptionHtml: input.descriptionHtml }),
                ...(input.vendor !== undefined && { vendor: input.vendor }),
                ...(input.productType !== undefined && { productType: input.productType }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.handle !== undefined && { handle: input.handle }),
                ...(input.seo !== undefined && {
                    seo: {
                        ...(input.seo.title !== undefined && { title: input.seo.title }),
                        ...(input.seo.description !== undefined && { description: input.seo.description })
                    }
                }),
                ...(input.productOptions !== undefined && {
                    productOptions: input.productOptions.map((opt) => ({
                        name: opt.name,
                        values: opt.values.map((val) => ({ name: val.name }))
                    }))
                })
            }
        };

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/productCreate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation CreateProduct($product: ProductCreateInput!) {
                        productCreate(product: $product) {
                            product {
                                id
                                title
                                handle
                                descriptionHtml
                                productType
                                vendor
                                status
                                tags
                                seo {
                                    title
                                    description
                                }
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables
            },
            retries: 1
        });

        const result = GraphQLResponseSchema.parse(response.data);

        const firstGraphQLError = result.errors?.[0];
        if (firstGraphQLError) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstGraphQLError.message
            });
        }

        const productCreate = result.data?.productCreate;
        if (!productCreate) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Missing productCreate in response.'
            });
        }

        const firstUserError = productCreate.userErrors?.[0];
        if (firstUserError) {
            throw new nango.ActionError({
                type: 'user_error',
                message: firstUserError.message,
                field: firstUserError.field.join('.')
            });
        }

        if (!productCreate.product) {
            throw new nango.ActionError({
                type: 'product_not_created',
                message: 'Product was not created.'
            });
        }

        const providerProduct = productCreate.product;

        return {
            id: providerProduct.id,
            title: providerProduct.title,
            ...(providerProduct.handle != null && { handle: providerProduct.handle }),
            ...(providerProduct.descriptionHtml != null && { descriptionHtml: providerProduct.descriptionHtml }),
            ...(providerProduct.productType != null && { productType: providerProduct.productType }),
            ...(providerProduct.vendor != null && { vendor: providerProduct.vendor }),
            ...(providerProduct.status != null && { status: providerProduct.status }),
            ...(providerProduct.tags !== undefined && { tags: providerProduct.tags }),
            ...(providerProduct.seo !== undefined && {
                seo: {
                    ...(providerProduct.seo.title != null && { title: providerProduct.seo.title }),
                    ...(providerProduct.seo.description != null && { description: providerProduct.seo.description })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
