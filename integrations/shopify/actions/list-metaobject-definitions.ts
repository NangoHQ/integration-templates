import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('The number of metaobject definitions to return. Max 250. Example: 10'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const FieldDefinitionSchema = z.object({
    key: z.string(),
    name: z.string(),
    typeName: z.string().optional()
});

const MetaobjectDefinitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    displayNameKey: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    metaobjectsCount: z.number(),
    fieldDefinitions: z.array(FieldDefinitionSchema).optional()
});

const OutputSchema = z.object({
    items: z.array(MetaobjectDefinitionSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Shopify metaobject definitions with pagination.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_metaobject_definitions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/queries/metaobjectDefinitions
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    query MetaobjectDefinitions($first: Int, $after: String) {
                        metaobjectDefinitions(first: $first, after: $after) {
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                            nodes {
                                id
                                name
                                type
                                description
                                displayNameKey
                                createdAt
                                updatedAt
                                metaobjectsCount
                                fieldDefinitions {
                                    key
                                    name
                                    type {
                                        name
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    first: input.first ?? 10,
                    ...(input.after !== undefined && { after: input.after })
                }
            },
            retries: 3
        });

        if (response.data && Array.isArray(response.data.errors) && response.data.errors.length > 0) {
            const messages = [];
            for (const err of response.data.errors) {
                if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
                    messages.push(err.message);
                }
            }
            throw new nango.ActionError({
                type: 'graphql_error',
                message: messages.join('; ')
            });
        }

        const providerResponse = z
            .object({
                data: z.object({
                    metaobjectDefinitions: z.object({
                        pageInfo: z.object({
                            hasNextPage: z.boolean(),
                            endCursor: z.string().nullable().optional()
                        }),
                        nodes: z.array(
                            z.object({
                                id: z.string(),
                                name: z.string(),
                                type: z.string(),
                                description: z.string().nullable().optional(),
                                displayNameKey: z.string().nullable().optional(),
                                createdAt: z.string(),
                                updatedAt: z.string(),
                                metaobjectsCount: z.number(),
                                fieldDefinitions: z
                                    .array(
                                        z.object({
                                            key: z.string(),
                                            name: z.string(),
                                            type: z.object({ name: z.string() }).nullable().optional()
                                        })
                                    )
                                    .nullable()
                                    .optional()
                            })
                        )
                    })
                })
            })
            .parse(response.data);

        const definitions = providerResponse.data.metaobjectDefinitions;

        return {
            items: definitions.nodes.map((node) => ({
                id: node.id,
                name: node.name,
                type: node.type,
                ...(node.description != null && { description: node.description }),
                ...(node.displayNameKey != null && { displayNameKey: node.displayNameKey }),
                createdAt: node.createdAt,
                updatedAt: node.updatedAt,
                metaobjectsCount: node.metaobjectsCount,
                ...(node.fieldDefinitions != null && {
                    fieldDefinitions: node.fieldDefinitions
                        .filter((fd) => fd != null)
                        .map((fd) => ({
                            key: fd.key,
                            name: fd.name,
                            ...(fd.type != null && { typeName: fd.type.name })
                        }))
                })
            })),
            ...(definitions.pageInfo.endCursor != null && { nextCursor: definitions.pageInfo.endCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
