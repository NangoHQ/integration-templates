import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    collectionId: z.string().describe('The GraphQL ID of the collection. Example: "gid://shopify/Collection/841564295"')
});

const CollectionImageSchema = z.object({
    url: z.string(),
    height: z.number().optional(),
    width: z.number().optional()
});

const CollectionRuleSchema = z.object({
    column: z.string(),
    relation: z.string(),
    condition: z.string()
});

const CollectionRuleSetSchema = z.object({
    appliedDisjunctively: z.boolean(),
    rules: z.array(CollectionRuleSchema)
});

const CollectionSeoSchema = z.object({
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable()
});

const ProviderCollectionSchema = z.object({
    id: z.string(),
    title: z.string(),
    handle: z.string(),
    description: z.string().optional().nullable(),
    descriptionHtml: z.string().optional().nullable(),
    updatedAt: z.string(),
    sortOrder: z.string(),
    image: CollectionImageSchema.nullable().optional(),
    ruleSet: CollectionRuleSetSchema.nullable().optional(),
    seo: CollectionSeoSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    handle: z.string(),
    description: z.string().optional(),
    descriptionHtml: z.string().optional(),
    updatedAt: z.string(),
    sortOrder: z.string(),
    image: z
        .object({
            url: z.string(),
            height: z.number().optional(),
            width: z.number().optional()
        })
        .optional(),
    ruleSet: z
        .object({
            appliedDisjunctively: z.boolean(),
            rules: z.array(
                z.object({
                    column: z.string(),
                    relation: z.string(),
                    condition: z.string()
                })
            )
        })
        .optional(),
    seo: z
        .object({
            title: z.string().optional(),
            description: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a Shopify collection by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-collection',
        group: 'Collections'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query: `
                    query GetCollection($id: ID!) {
                        collection(id: $id) {
                            id
                            title
                            handle
                            description
                            descriptionHtml
                            updatedAt
                            sortOrder
                            image {
                                url
                                height
                                width
                            }
                            ruleSet {
                                appliedDisjunctively
                                rules {
                                    column
                                    relation
                                    condition
                                }
                            }
                            seo {
                                title
                                description
                            }
                        }
                    }
                `,
                variables: {
                    id: input.collectionId
                }
            },
            retries: 3
        });

        const GraphQLResponseSchema = z.object({
            data: z
                .object({
                    collection: z.unknown().optional().nullable()
                })
                .optional()
                .nullable(),
            errors: z.array(z.unknown()).optional().nullable()
        });

        const responseData = GraphQLResponseSchema.parse(response.data);
        if (responseData.errors && responseData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Shopify GraphQL returned errors',
                errors: responseData.errors
            });
        }

        const collection = responseData.data?.collection;
        if (!collection) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Collection not found',
                collectionId: input.collectionId
            });
        }

        const providerCollection = ProviderCollectionSchema.parse(collection);

        return {
            id: providerCollection.id,
            title: providerCollection.title,
            handle: providerCollection.handle,
            ...(providerCollection.description != null && providerCollection.description !== '' && { description: providerCollection.description }),
            ...(providerCollection.descriptionHtml != null &&
                providerCollection.descriptionHtml !== '' && { descriptionHtml: providerCollection.descriptionHtml }),
            updatedAt: providerCollection.updatedAt,
            sortOrder: providerCollection.sortOrder,
            ...(providerCollection.image != null && {
                image: {
                    url: providerCollection.image.url,
                    ...(providerCollection.image.height !== undefined && { height: providerCollection.image.height }),
                    ...(providerCollection.image.width !== undefined && { width: providerCollection.image.width })
                }
            }),
            ...(providerCollection.ruleSet != null && {
                ruleSet: {
                    appliedDisjunctively: providerCollection.ruleSet.appliedDisjunctively,
                    rules: providerCollection.ruleSet.rules.map((rule) => ({
                        column: rule.column,
                        relation: rule.relation,
                        condition: rule.condition
                    }))
                }
            }),
            ...(providerCollection.seo != null && {
                seo: {
                    ...(providerCollection.seo.title != null && { title: providerCollection.seo.title }),
                    ...(providerCollection.seo.description != null && { description: providerCollection.seo.description })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
