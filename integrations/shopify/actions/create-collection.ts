import { z } from 'zod';
import { createAction } from 'nango';

const ImageInputSchema = z.object({
    altText: z.string().optional(),
    id: z.string().optional(),
    src: z.string().optional()
});

const MetafieldInputSchema = z.object({
    id: z.string().optional(),
    key: z.string().optional(),
    namespace: z.string().optional(),
    type: z.string().optional(),
    value: z.string().optional()
});

const CollectionRuleInputSchema = z.object({
    column: z.string(),
    condition: z.string(),
    conditionObjectId: z.string().optional(),
    relation: z.string()
});

const CollectionRuleSetInputSchema = z.object({
    appliedDisjunctively: z.boolean(),
    rules: z.array(CollectionRuleInputSchema)
});

const SeoInputSchema = z.object({
    description: z.string().optional(),
    title: z.string().optional()
});

const CollectionPublicationInputSchema = z.object({
    publicationId: z.string().optional()
});

const InputSchema = z.object({
    title: z.string().describe('The title of the collection.'),
    descriptionHtml: z.string().optional().describe('The description of the collection, in HTML format.'),
    handle: z.string().optional().describe('A unique human-friendly string for the collection.'),
    image: ImageInputSchema.optional().describe('The image associated with the collection.'),
    metafields: z.array(MetafieldInputSchema).optional().describe('The metafields to associate with the collection.'),
    products: z.array(z.string()).optional().describe('Initial list of collection product IDs. Only valid without rules.'),
    redirectNewHandle: z.boolean().optional().describe('Whether to redirect after a new handle has been provided.'),
    ruleSet: CollectionRuleSetInputSchema.optional().describe('The rules used to assign products to the collection.'),
    seo: SeoInputSchema.optional().describe('SEO information for the collection.'),
    sortOrder: z.string().optional().describe('The order in which the collection products are sorted.'),
    templateSuffix: z.string().optional().describe('The theme template used when viewing the collection in a store.'),
    publications: z.array(CollectionPublicationInputSchema).optional().describe('The publications to which the collection will be published.')
});

const CollectionSchema = z.object({
    id: z.string(),
    title: z.string(),
    descriptionHtml: z.string().nullable().optional(),
    handle: z.string().nullable().optional(),
    sortOrder: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The globally unique ID of the collection.'),
    title: z.string().describe('The title of the collection.'),
    descriptionHtml: z.string().optional().describe('The description of the collection, in HTML format.'),
    handle: z.string().optional().describe('A unique human-friendly string for the collection.'),
    sortOrder: z.string().optional().describe('The order in which the collection products are sorted.'),
    updatedAt: z.string().optional().describe('The date and time when the collection was last updated.')
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        collectionCreate: z.object({
            collection: z.unknown().nullable(),
            userErrors: z.array(
                z.object({
                    field: z.array(z.string()).nullable().optional(),
                    message: z.string()
                })
            )
        })
    })
});

const action = createAction({
    description: 'Create a Shopify collection.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-collection',
        group: 'Collections'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation CollectionCreate($input: CollectionInput!) {
                collectionCreate(input: $input) {
                    collection {
                        id
                        title
                        descriptionHtml
                        handle
                        sortOrder
                        updatedAt
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            input: {
                title: input.title,
                ...(input.descriptionHtml !== undefined && { descriptionHtml: input.descriptionHtml }),
                ...(input.handle !== undefined && { handle: input.handle }),
                ...(input.image !== undefined && { image: input.image }),
                ...(input.metafields !== undefined && { metafields: input.metafields }),
                ...(input.products !== undefined && { products: input.products }),
                ...(input.redirectNewHandle !== undefined && { redirectNewHandle: input.redirectNewHandle }),
                ...(input.ruleSet !== undefined && { ruleSet: input.ruleSet }),
                ...(input.seo !== undefined && { seo: input.seo }),
                ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
                ...(input.templateSuffix !== undefined && { templateSuffix: input.templateSuffix }),
                ...(input.publications !== undefined && { publications: input.publications })
            }
        };

        // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/collectionCreate
        const response = await nango.post({
            endpoint: 'admin/api/2026-04/graphql.json',
            data: {
                query: mutation,
                variables: variables
            },
            retries: 3
        });

        const responseData = z.object({ data: z.unknown() }).parse(response);
        const parsed = GraphQLResponseSchema.parse(responseData.data);
        const result = parsed.data.collectionCreate;

        const firstError = result.userErrors[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'collection_create_error',
                message: firstError.message,
                field: firstError.field
            });
        }

        if (!result.collection) {
            throw new nango.ActionError({
                type: 'collection_create_error',
                message: 'Collection creation failed with no returned collection.'
            });
        }

        const collection = CollectionSchema.parse(result.collection);

        return {
            id: collection.id,
            title: collection.title,
            ...(collection.descriptionHtml != null && { descriptionHtml: collection.descriptionHtml }),
            ...(collection.handle != null && { handle: collection.handle }),
            ...(collection.sortOrder != null && { sortOrder: collection.sortOrder }),
            ...(collection.updatedAt != null && { updatedAt: collection.updatedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
