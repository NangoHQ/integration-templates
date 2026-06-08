import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GraphQL ID of the Shopify file. Example: "gid://shopify/MediaImage/1234567890"')
});

const ProviderPreviewImageSchema = z.object({
    url: z.string().optional()
});

const ProviderPreviewSchema = z.object({
    image: ProviderPreviewImageSchema.optional()
});

const ProviderNodeSchema = z.object({
    __typename: z.string().optional(),
    alt: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    preview: ProviderPreviewSchema.nullable().optional(),
    url: z.string().nullable().optional(),
    mediaContentType: z.string().nullable().optional(),
    image: z
        .object({
            url: z.string().optional()
        })
        .optional(),
    originalSource: z
        .object({
            url: z.string().optional()
        })
        .optional(),
    embeddedUrl: z.string().nullable().optional()
});

const OutputSchema = z.object({
    preview: ProviderPreviewSchema.optional(),
    url: z.string().optional(),
    alt: z.string().optional(),
    mediaContentType: z.string().optional(),
    createdAt: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a Shopify file resource by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_files'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/latest/queries/node
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query: `
                    query GetFile($id: ID!) {
                        node(id: $id) {
                            ... on File {
                                __typename
                                alt
                                createdAt
                                preview {
                                    image {
                                        url
                                    }
                                }
                                ... on GenericFile {
                                    url
                                }
                                ... on MediaImage {
                                    image {
                                        url
                                    }
                                    mediaContentType
                                }
                                ... on Video {
                                    originalSource {
                                        url
                                    }
                                    mediaContentType
                                }
                                ... on ExternalVideo {
                                    embeddedUrl
                                    mediaContentType
                                }
                                ... on Model3d {
                                    mediaContentType
                                }
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const GraphQLResponseSchema = z.object({
            data: z.unknown().optional(),
            errors: z.array(z.unknown()).optional()
        });

        const body = GraphQLResponseSchema.parse(response.data);

        if (body.errors && body.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'GraphQL error from Shopify',
                errors: body.errors
            });
        }

        if (!body.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'File not found',
                id: input.id
            });
        }

        const DataSchema = z.object({
            node: z.unknown().optional()
        });

        const data = DataSchema.parse(body.data);
        const node = data.node;

        if (!node) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'File not found',
                id: input.id
            });
        }

        const file = ProviderNodeSchema.parse(node);

        let url: string | undefined;
        if (file.__typename === 'GenericFile') {
            url = file.url ?? undefined;
        } else if (file.__typename === 'MediaImage') {
            url = file.image?.url;
        } else if (file.__typename === 'Video') {
            url = file.originalSource?.url;
        } else if (file.__typename === 'ExternalVideo') {
            url = file.embeddedUrl ?? undefined;
        }

        return {
            ...(file.preview != null && { preview: file.preview }),
            ...(url !== undefined && { url }),
            ...(file.alt != null && { alt: file.alt }),
            ...(file.mediaContentType != null && { mediaContentType: file.mediaContentType }),
            ...(file.createdAt != null && { createdAt: file.createdAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
