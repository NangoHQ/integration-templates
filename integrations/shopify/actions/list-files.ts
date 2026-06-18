import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('Number of files to fetch. Example: 50'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    sortKey: z.string().optional().describe('Sort key for the files. Example: ID'),
    reverse: z.boolean().optional().describe('Reverse the order of the underlying list.'),
    query: z.string().optional().describe('Filter query string. Example: media_type:IMAGE')
});

const PreviewImageSchema = z.object({
    image: z
        .object({
            url: z.string().optional()
        })
        .optional()
});

const FileSchema = z.object({
    id: z.string(),
    alt: z.string().optional(),
    mediaContentType: z.string().optional(),
    url: z.string().optional(),
    preview: PreviewImageSchema.optional()
});

const OutputSchema = z.object({
    files: z.array(FileSchema),
    next_cursor: z.string().optional()
});

const ProviderPreviewImageSchema = z.object({
    image: z
        .object({
            url: z.string().optional().nullable()
        })
        .optional()
        .nullable()
});

const ProviderGenericFileSchema = z.object({
    __typename: z.literal('GenericFile'),
    id: z.string(),
    alt: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    preview: ProviderPreviewImageSchema.optional().nullable()
});

const ProviderMediaImageSchema = z.object({
    __typename: z.literal('MediaImage'),
    id: z.string(),
    alt: z.string().optional().nullable(),
    mediaContentType: z.string().optional().nullable(),
    image: z
        .object({
            url: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    preview: ProviderPreviewImageSchema.optional().nullable()
});

const ProviderVideoSchema = z.object({
    __typename: z.literal('Video'),
    id: z.string(),
    alt: z.string().optional().nullable(),
    mediaContentType: z.string().optional().nullable(),
    originalSource: z
        .object({
            url: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    preview: ProviderPreviewImageSchema.optional().nullable()
});

const ProviderModel3dSchema = z.object({
    __typename: z.literal('Model3d'),
    id: z.string(),
    alt: z.string().optional().nullable(),
    mediaContentType: z.string().optional().nullable(),
    originalSource: z
        .object({
            url: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    preview: ProviderPreviewImageSchema.optional().nullable()
});

const ProviderExternalVideoSchema = z.object({
    __typename: z.literal('ExternalVideo'),
    id: z.string(),
    alt: z.string().optional().nullable(),
    mediaContentType: z.string().optional().nullable(),
    originUrl: z.string().optional().nullable(),
    preview: ProviderPreviewImageSchema.optional().nullable()
});

const ProviderFileNodeSchema = z.union([
    ProviderGenericFileSchema,
    ProviderMediaImageSchema,
    ProviderVideoSchema,
    ProviderModel3dSchema,
    ProviderExternalVideoSchema
]);

const ProviderPageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().optional().nullable()
});

const ProviderFilesConnectionSchema = z.object({
    edges: z.array(
        z.object({
            node: ProviderFileNodeSchema
        })
    ),
    pageInfo: ProviderPageInfoSchema
});

const GraphQLErrorResponseSchema = z.object({
    errors: z.array(z.unknown())
});

const GraphQLSuccessResponseSchema = z.object({
    data: z.object({
        files: ProviderFilesConnectionSchema
    })
});

const action = createAction({
    description: 'List Shopify file resources with cursor pagination.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_files'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const graphQuery = `
            query ListFiles($first: Int!, $after: String, $sortKey: FileSortKeys, $reverse: Boolean, $query: String) {
                files(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
                    edges {
                        node {
                            __typename
                            id
                            alt
                            preview {
                                image {
                                    url
                                }
                            }
                            ... on GenericFile {
                                url
                            }
                            ... on MediaImage {
                                mediaContentType
                                image {
                                    url
                                }
                            }
                            ... on Video {
                                mediaContentType
                                originalSource {
                                    url
                                }
                            }
                            ... on Model3d {
                                mediaContentType
                                originalSource {
                                    url
                                }
                            }
                            ... on ExternalVideo {
                                mediaContentType
                                originUrl
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        const variables: Record<string, unknown> = {
            first: input.first ?? 50
        };

        if (input.after !== undefined) {
            variables['after'] = input.after;
        }

        if (input.sortKey !== undefined) {
            variables['sortKey'] = input.sortKey;
        }

        if (input.reverse !== undefined) {
            variables['reverse'] = input.reverse;
        }

        if (input.query !== undefined) {
            variables['query'] = input.query;
        }

        // https://shopify.dev/docs/api/admin-graphql/2026-04/queries/files
        const response = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: graphQuery,
                variables
            },
            retries: 3
        });

        const errorCheck = GraphQLErrorResponseSchema.safeParse(response.data);
        if (errorCheck.success) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Shopify GraphQL returned errors',
                errors: errorCheck.data.errors
            });
        }

        const parsed = GraphQLSuccessResponseSchema.parse(response.data);

        const files = parsed.data.files.edges.map((edge) => {
            const node = edge.node;
            let url: string | undefined;
            let mediaContentType: string | undefined;

            if (node.__typename === 'GenericFile') {
                url = node.url ?? undefined;
            } else if (node.__typename === 'MediaImage') {
                url = node.image?.url ?? undefined;
                mediaContentType = node.mediaContentType ?? undefined;
            } else if (node.__typename === 'Video') {
                url = node.originalSource?.url ?? undefined;
                mediaContentType = node.mediaContentType ?? undefined;
            } else if (node.__typename === 'Model3d') {
                url = node.originalSource?.url ?? undefined;
                mediaContentType = node.mediaContentType ?? undefined;
            } else if (node.__typename === 'ExternalVideo') {
                url = node.originUrl ?? undefined;
                mediaContentType = node.mediaContentType ?? undefined;
            }

            return {
                id: node.id,
                ...(node.alt != null && { alt: node.alt }),
                ...(mediaContentType !== undefined && { mediaContentType }),
                ...(url !== undefined && { url }),
                ...(node.preview != null &&
                    node.preview.image != null && {
                        preview: {
                            image: {
                                ...(node.preview.image.url != null && { url: node.preview.image.url })
                            }
                        }
                    })
            };
        });

        const pageInfo = parsed.data.files.pageInfo;

        return {
            files,
            ...(pageInfo.hasNextPage === true && pageInfo.endCursor != null ? { next_cursor: pageInfo.endCursor } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
