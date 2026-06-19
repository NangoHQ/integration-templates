import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The Shopify global ID of the collection. Example: "gid://shopify/Collection/123456789"'),
    title: z.string().optional(),
    descriptionHtml: z.string().optional(),
    handle: z.string().optional(),
    image: z
        .object({
            src: z.string(),
            altText: z.string().optional()
        })
        .nullable()
        .optional(),
    seo: z
        .object({
            title: z.string().optional(),
            description: z.string().optional()
        })
        .optional(),
    sortOrder: z.string().optional(),
    templateSuffix: z.string().nullable().optional(),
    redirectNewHandle: z.boolean().optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const CollectionImageSchema = z.object({
    src: z.string().optional(),
    altText: z.string().nullable().optional()
});

const CollectionSeoSchema = z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional()
});

const ProviderCollectionSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    handle: z.string().nullable().optional(),
    image: CollectionImageSchema.nullable().optional(),
    seo: CollectionSeoSchema.nullable().optional(),
    sortOrder: z.string().nullable().optional(),
    templateSuffix: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        collectionUpdate: z.object({
            collection: ProviderCollectionSchema.nullable(),
            userErrors: z.array(UserErrorSchema)
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    handle: z.string().optional(),
    image: z
        .object({
            src: z.string().optional(),
            altText: z.string().optional()
        })
        .optional(),
    seo: z
        .object({
            title: z.string().optional(),
            description: z.string().optional()
        })
        .optional(),
    sortOrder: z.string().optional(),
    templateSuffix: z.string().optional(),
    userErrors: z.array(z.object({ field: z.array(z.string()).optional(), message: z.string() })).optional()
});

const action = createAction({
    description: 'Update a Shopify collection.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const collectionInput: Record<string, unknown> = {
            id: input.id
        };

        if (input.title !== undefined) {
            collectionInput['title'] = input.title;
        }
        if (input.descriptionHtml !== undefined) {
            collectionInput['descriptionHtml'] = input.descriptionHtml;
        }
        if (input.handle !== undefined) {
            collectionInput['handle'] = input.handle;
        }
        if (input.image !== undefined) {
            collectionInput['image'] = input.image;
        }
        if (input.seo !== undefined) {
            collectionInput['seo'] = input.seo;
        }
        if (input.sortOrder !== undefined) {
            collectionInput['sortOrder'] = input.sortOrder;
        }
        if (input.templateSuffix !== undefined) {
            collectionInput['templateSuffix'] = input.templateSuffix;
        }
        if (input.redirectNewHandle !== undefined) {
            collectionInput['redirectNewHandle'] = input.redirectNewHandle;
        }

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/collectionUpdate
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query: `mutation CollectionUpdate($input: CollectionInput!) {
                    collectionUpdate(input: $input) {
                        collection {
                            id
                            title
                            description
                            handle
                            image {
                                src
                                altText
                            }
                            seo {
                                title
                                description
                            }
                            sortOrder
                            templateSuffix
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }`,
                variables: {
                    input: collectionInput
                }
            },
            retries: 1
        };

        const response = await nango.post(config);

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify',
                details: parsed.error.message
            });
        }

        const payload = parsed.data.data.collectionUpdate;

        if (payload.userErrors.length > 0) {
            return {
                id: input.id,
                userErrors: payload.userErrors.map((err) => ({
                    ...(err.field !== undefined && { field: err.field }),
                    message: err.message
                }))
            };
        }

        if (!payload.collection) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Collection not found',
                id: input.id
            });
        }

        const collection = payload.collection;

        return {
            id: collection.id,
            ...(collection.title !== null && collection.title !== undefined && { title: collection.title }),
            ...(collection.description !== null && collection.description !== undefined && { description: collection.description }),
            ...(collection.handle !== null && collection.handle !== undefined && { handle: collection.handle }),
            ...(collection.image !== null &&
                collection.image !== undefined && {
                    image: {
                        ...(collection.image.src !== undefined && { src: collection.image.src }),
                        ...(collection.image.altText !== null && collection.image.altText !== undefined && { altText: collection.image.altText })
                    }
                }),
            ...(collection.seo !== null &&
                collection.seo !== undefined && {
                    seo: {
                        ...(collection.seo.title !== null && collection.seo.title !== undefined && { title: collection.seo.title }),
                        ...(collection.seo.description !== null && collection.seo.description !== undefined && { description: collection.seo.description })
                    }
                }),
            ...(collection.sortOrder !== null && collection.sortOrder !== undefined && { sortOrder: collection.sortOrder }),
            ...(collection.templateSuffix !== null && collection.templateSuffix !== undefined && { templateSuffix: collection.templateSuffix })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
