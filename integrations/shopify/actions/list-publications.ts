import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('The number of publications to return. Max 250.'),
    after: z.string().optional().describe('Pagination cursor from the previous response.')
});

const AppSchema = z.object({
    id: z.string(),
    title: z.string().optional()
});

const PublicationSchema = z.object({
    id: z.string(),
    name: z.string(),
    app: AppSchema
});

const OutputSchema = z.object({
    publications: z.array(PublicationSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List available Shopify sales channel publications.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-publications'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_publications'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-04/queries/publications
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query: `
                    query publications($first: Int, $after: String) {
                        publications(first: $first, after: $after) {
                            nodes {
                                id
                                name
                                app {
                                    id
                                    title
                                }
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables: {
                    ...(input.first !== undefined && { first: input.first }),
                    ...(input.after !== undefined && { after: input.after })
                }
            },
            retries: 3
        });

        const ResponseSchema = z.object({
            data: z
                .object({
                    publications: z
                        .object({
                            nodes: z.array(
                                z.object({
                                    id: z.string(),
                                    name: z.string(),
                                    app: z.object({
                                        id: z.string(),
                                        title: z.string().optional()
                                    })
                                })
                            ),
                            pageInfo: z.object({
                                hasNextPage: z.boolean(),
                                endCursor: z.string().optional()
                            })
                        })
                        .optional()
                })
                .optional(),
            errors: z.array(z.object({ message: z.string() })).optional()
        });

        const parsed = ResponseSchema.parse(response.data);

        const firstError = parsed.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstError.message
            });
        }

        const publicationsData = parsed.data?.publications;

        if (!publicationsData) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify GraphQL API: missing publications data.'
            });
        }

        return {
            publications: publicationsData.nodes.map((node) => ({
                id: node.id,
                name: node.name,
                app: {
                    id: node.app.id,
                    ...(node.app.title !== undefined && { title: node.app.title })
                }
            })),
            ...(publicationsData.pageInfo.hasNextPage && publicationsData.pageInfo.endCursor !== undefined
                ? { nextCursor: publicationsData.pageInfo.endCursor }
                : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
