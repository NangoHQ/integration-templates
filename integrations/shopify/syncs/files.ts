import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ImageSchema = z.object({
    url: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional()
});

const MediaPreviewImageSchema = z.object({
    image: ImageSchema.nullable().optional(),
    status: z.string()
});

const GenericFileNodeSchema = z.object({
    __typename: z.literal('GenericFile'),
    id: z.string(),
    alt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    preview: MediaPreviewImageSchema.nullable().optional(),
    url: z.string().nullable().optional()
});

const MediaImageNodeSchema = z.object({
    __typename: z.literal('MediaImage'),
    id: z.string(),
    alt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    preview: MediaPreviewImageSchema.nullable().optional(),
    mediaContentType: z.string(),
    image: ImageSchema.nullable().optional()
});

const VideoNodeSchema = z.object({
    __typename: z.literal('Video'),
    id: z.string(),
    alt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    preview: MediaPreviewImageSchema.nullable().optional(),
    mediaContentType: z.string(),
    originalSource: z.object({ url: z.string().optional() }).nullable().optional()
});

const Model3dNodeSchema = z.object({
    __typename: z.literal('Model3d'),
    id: z.string(),
    alt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    preview: MediaPreviewImageSchema.nullable().optional(),
    mediaContentType: z.string(),
    originalSource: z.object({ url: z.string().optional() }).nullable().optional()
});

const ExternalVideoNodeSchema = z.object({
    __typename: z.literal('ExternalVideo'),
    id: z.string(),
    alt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    preview: MediaPreviewImageSchema.nullable().optional(),
    mediaContentType: z.string(),
    originUrl: z.string()
});

const FileNodeSchema = z.union([GenericFileNodeSchema, MediaImageNodeSchema, VideoNodeSchema, Model3dNodeSchema, ExternalVideoNodeSchema]);

const FileSchema = z.object({
    id: z.string(),
    mediaContentType: z.string(),
    preview: z
        .object({
            url: z.string().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
            status: z.string().optional()
        })
        .optional(),
    url: z.string().optional(),
    alt: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify file resources including images and generic files.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        File: FileSchema
    },
    endpoints: [
        {
            path: '/syncs/files',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', cursor: '' });
        const updatedAfter = checkpoint.updated_after || undefined;
        let cursor = checkpoint.cursor || undefined;
        let maxUpdatedAt: string | undefined;

        const queryFilter = updatedAfter ? `updated_at:>'${updatedAfter}'` : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-04/queries/files
            endpoint: '/admin/api/2026-04/graphql.json',
            method: 'POST',
            data: {
                query: `
                    query ($first: Int!, $after: String, $query: String, $sortKey: FileSortKeys) {
                        files(first: $first, after: $after, query: $query, sortKey: $sortKey) {
                            nodes {
                                __typename
                                id
                                alt
                                createdAt
                                updatedAt
                                preview {
                                    image {
                                        url
                                        width
                                        height
                                    }
                                    status
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
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables: {
                    first: 50,
                    ...(cursor && { after: cursor }),
                    query: queryFilter,
                    sortKey: 'UPDATED_AT'
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.files.pageInfo.endCursor',
                response_path: 'data.files.nodes',
                limit_name_in_request: 'variables.first',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const files: z.infer<typeof FileSchema>[] = [];

            for (const raw of page) {
                const parsed = FileNodeSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse file node: ${parsed.error.message}`);
                }

                const node = parsed.data;
                let mediaContentType: string;
                let url: string | undefined;

                switch (node.__typename) {
                    case 'GenericFile': {
                        mediaContentType = 'FILE';
                        url = node.url ?? undefined;
                        break;
                    }
                    case 'MediaImage': {
                        mediaContentType = node.mediaContentType;
                        url = node.image?.url;
                        break;
                    }
                    case 'Video': {
                        mediaContentType = node.mediaContentType;
                        url = node.originalSource?.url;
                        break;
                    }
                    case 'Model3d': {
                        mediaContentType = node.mediaContentType;
                        url = node.originalSource?.url;
                        break;
                    }
                    case 'ExternalVideo': {
                        mediaContentType = node.mediaContentType;
                        url = node.originUrl;
                        break;
                    }
                }

                const preview = node.preview
                    ? {
                          url: node.preview.image?.url,
                          width: node.preview.image?.width,
                          height: node.preview.image?.height,
                          status: node.preview.status
                      }
                    : undefined;

                const alt = node.alt ?? undefined;

                files.push({
                    id: node.id,
                    mediaContentType,
                    ...(preview && { preview }),
                    ...(url && { url }),
                    ...(alt && { alt }),
                    createdAt: node.createdAt,
                    updatedAt: node.updatedAt
                });
            }

            if (files.length === 0) {
                if (cursor !== undefined) {
                    await nango.saveCheckpoint({
                        updated_after: updatedAfter || '',
                        cursor
                    });
                }
                continue;
            }

            await nango.batchSave(files, 'File');

            for (const file of files) {
                if (maxUpdatedAt === undefined || file.updatedAt > maxUpdatedAt) {
                    maxUpdatedAt = file.updatedAt;
                }
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    cursor
                });
            }
        }

        if (maxUpdatedAt !== undefined) {
            await nango.saveCheckpoint({
                updated_after: maxUpdatedAt,
                cursor: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
