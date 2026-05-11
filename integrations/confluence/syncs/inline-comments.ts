import { createSync } from 'nango';
import { z } from 'zod';

const InlineCommentSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    resolutionStatus: z.string().optional(),
    inlineMarkerRef: z.string().optional(),
    inlineOriginalSelection: z.string().optional(),
    title: z.string().optional(),
    pageId: z.string().optional(),
    blogPostId: z.string().optional(),
    createdAt: z.string().optional(),
    authorId: z.string().optional()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const InlineCommentsResponseSchema = z.object({
    results: z.array(
        z.object({
            id: z.string(),
            status: z.string().optional(),
            resolutionStatus: z.string().optional(),
            title: z.string().optional(),
            pageId: z.string().optional(),
            blogPostId: z.string().optional(),
            properties: z
                .object({
                    inlineMarkerRef: z.string().optional(),
                    inlineOriginalSelection: z.string().optional()
                })
                .passthrough()
                .optional(),
            version: z
                .object({
                    createdAt: z.string().optional(),
                    authorId: z.string().optional()
                })
                .passthrough()
                .optional()
        })
    ),
    _links: z
        .object({
            next: z.string().optional(),
            base: z.string().optional()
        })
        .optional()
});

function extractCursorFromNextUrl(nextUrl: string): string {
    const url = new URL(nextUrl, 'https://dummy');
    const cursor = url.searchParams.get('cursor');

    if (!cursor) {
        throw new Error('Confluence inline comments response included a next link without a cursor');
    }

    return cursor;
}

const sync = createSync({
    description: 'Sync Confluence inline comments visible to the connection',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/inline-comments',
            method: 'GET'
        }
    ],
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        InlineComment: InlineCommentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let cursor = checkpoint?.cursor ?? '';

        const connection = await nango.getConnection();
        let cloudId: string | undefined = connection.connection_config?.['cloudId'];

        if (!cloudId) {
            const metadata = MetadataSchema.parse((await nango.getMetadata()) ?? {});
            cloudId = metadata.cloudId;
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/#get-accessible-resources
            const resourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resources = z.array(z.object({ id: z.string() })).safeParse(resourcesResponse.data);
            if (!resources.success || !resources.data || resources.data.length === 0) {
                throw new Error('Could not resolve Confluence cloudId from accessible resources');
            }
            if (resources.data.length > 1) {
                throw new Error('Multiple Confluence sites found. Please set an explicit cloudId in the connection metadata or connection_config.');
            }

            cloudId = resources.data[0]!.id;
            await nango.updateMetadata({ cloudId });
        }

        let deleteTrackingStarted = false;
        if (!cursor) {
            await nango.trackDeletesStart('InlineComment');
            deleteTrackingStarted = true;
        }
        let checkpointSaved = false;

        try {
            while (true) {
                const response = await nango.get({
                    // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-inline-comments/#api-wiki-api-v2-inline-comments-get
                    endpoint: '/wiki/api/v2/inline-comments',
                    baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
                    params: {
                        limit: 100,
                        ...(cursor ? { cursor } : {})
                    },
                    retries: 3
                });

                const parsed = InlineCommentsResponseSchema.parse(response.data);
                const comments = parsed.results.map((comment) => ({
                    id: comment.id,
                    ...(comment.status !== undefined && { status: comment.status }),
                    ...(comment.resolutionStatus !== undefined && { resolutionStatus: comment.resolutionStatus }),
                    ...(comment.properties?.inlineMarkerRef !== undefined && { inlineMarkerRef: comment.properties.inlineMarkerRef }),
                    ...(comment.properties?.inlineOriginalSelection !== undefined && {
                        inlineOriginalSelection: comment.properties.inlineOriginalSelection
                    }),
                    ...(comment.title !== undefined && { title: comment.title }),
                    ...(comment.pageId !== undefined && { pageId: comment.pageId }),
                    ...(comment.blogPostId !== undefined && { blogPostId: comment.blogPostId }),
                    ...(comment.version?.createdAt !== undefined && { createdAt: comment.version.createdAt }),
                    ...(comment.version?.authorId !== undefined && { authorId: comment.version.authorId })
                }));

                if (comments.length > 0) {
                    await nango.batchSave(comments, 'InlineComment');
                }

                const nextUrl = parsed._links?.next;
                if (!nextUrl) {
                    break;
                }

                cursor = extractCursorFromNextUrl(nextUrl);
                await nango.saveCheckpoint({ cursor });
                checkpointSaved = true;
            }
        } finally {
            if (deleteTrackingStarted) {
                await nango.trackDeletesEnd('InlineComment');
            }
        }

        if (checkpointSaved) {
            await nango.clearCheckpoint();
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
