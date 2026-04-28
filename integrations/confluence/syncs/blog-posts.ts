import { createSync } from 'nango';
import { z } from 'zod';

const BlogPostSchema = z.object({
    id: z.string().describe('The ID of the blog post'),
    status: z.string().optional().describe('The status of the blog post'),
    title: z.string().optional().describe('The title of the blog post'),
    spaceId: z.string().optional().describe('The ID of the space containing the blog post'),
    authorId: z.string().optional().describe('The ID of the author'),
    createdAt: z.string().optional().describe('The creation timestamp'),
    version: z
        .object({
            createdAt: z.string().optional(),
            message: z.string().optional(),
            number: z.number().optional(),
            minorEdit: z.boolean().optional(),
            authorId: z.string().optional()
        })
        .optional(),
    body: z
        .object({
            storage: z.unknown().optional(),
            atlas_doc_format: z.unknown().optional()
        })
        .optional(),
    _links: z
        .object({
            webui: z.string().optional(),
            editui: z.string().optional(),
            tinyui: z.string().optional()
        })
        .optional()
});

const BlogPostListResponseSchema = z.object({
    results: z.array(BlogPostSchema),
    _links: z
        .object({
            next: z.string().optional(),
            base: z.string().optional()
        })
        .optional()
});

const AccessibleResourcesSchema = z.array(
    z.object({
        id: z.string()
    })
);

const MetadataSchema = z.object({
    cloudId: z.string().optional(),
    spaceIds: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    cursor: z.string(),
    spaceId: z.string(),
    spaceIndex: z.number().int(),
    deleteTrackingStarted: z.boolean()
});

const INITIAL_CHECKPOINT = {
    cursor: '',
    spaceId: '',
    spaceIndex: 0,
    deleteTrackingStarted: false
};

function extractCursorFromNextUrl(nextUrl: string): string {
    const url = new URL(nextUrl, 'https://dummy');
    const cursor = url.searchParams.get('cursor');

    if (!cursor) {
        throw new Error('Confluence blog posts response included a next link without a cursor');
    }

    return cursor;
}

function parseCheckpoint(value: unknown): z.infer<typeof CheckpointSchema> {
    const parsed = CheckpointSchema.safeParse(value);

    if (!parsed.success) {
        return { ...INITIAL_CHECKPOINT };
    }

    return parsed.data;
}

function mapBlogPost(post: z.infer<typeof BlogPostSchema>) {
    return {
        id: post.id,
        ...(post.status !== undefined && { status: post.status }),
        ...(post.title !== undefined && { title: post.title }),
        ...(post.spaceId !== undefined && { spaceId: post.spaceId }),
        ...(post.authorId !== undefined && { authorId: post.authorId }),
        ...(post.createdAt !== undefined && { createdAt: post.createdAt }),
        ...(post.version !== undefined && { version: post.version }),
        ...(post.body !== undefined && { body: post.body }),
        ...(post._links !== undefined && { _links: post._links })
    };
}

const sync = createSync({
    description: 'Sync Confluence blog posts across accessible spaces or configured space ids.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        BlogPost: BlogPostSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/blog-posts'
        }
    ],
    scopes: ['read:page:confluence'],
    metadata: MetadataSchema,

    exec: async (nango) => {
        const metadata = MetadataSchema.parse((await nango.getMetadata()) ?? {});
        let cloudId = metadata.cloudId ?? '';

        if (!cloudId) {
            const connection = await nango.getConnection();
            if (connection && 'connection_config' in connection && connection.connection_config) {
                cloudId = connection.connection_config['cloudId'] || '';
            }
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/
            const resourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const parsedResources = AccessibleResourcesSchema.safeParse(resourcesResponse.data);
            if (!parsedResources.success || parsedResources.data.length === 0) {
                await nango.log('No accessible Confluence resources found');
                return;
            }

            const firstResource = parsedResources.data[0];
            if (firstResource === undefined) {
                await nango.log('No accessible Confluence resources found');
                return;
            }

            cloudId = firstResource.id;
            await nango.updateMetadata({ cloudId });
        }

        const baseUrlOverride = `https://api.atlassian.com/ex/confluence/${cloudId}`;

        const spaceIds = metadata.spaceIds ?? [];

        const checkpoint = parseCheckpoint(await nango.getCheckpoint());

        if (!checkpoint.deleteTrackingStarted) {
            await nango.trackDeletesStart('BlogPost');
            await nango.saveCheckpoint({ ...checkpoint, deleteTrackingStarted: true });
        }

        let currentSpaceIndex = 0;
        let currentCursor = '';

        if (spaceIds.length > 0) {
            if (checkpoint.spaceId !== '' && spaceIds.includes(checkpoint.spaceId)) {
                currentSpaceIndex = spaceIds.indexOf(checkpoint.spaceId);
                currentCursor = checkpoint.cursor;
            } else if (checkpoint.spaceIndex < spaceIds.length) {
                currentSpaceIndex = checkpoint.spaceIndex;
                currentCursor = checkpoint.cursor;
            }
        } else {
            currentCursor = checkpoint.cursor;
        }

        if (spaceIds.length === 0) {
            let cursor = currentCursor;

            while (true) {
                const params: Record<string, string | number> = {
                    'body-format': 'storage',
                    limit: 100
                };
                if (cursor !== '') {
                    params['cursor'] = cursor;
                }

                // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#get-blog-posts
                const response = await nango.get({
                    endpoint: '/wiki/api/v2/blogposts',
                    baseUrlOverride,
                    params,
                    retries: 3
                });

                const parsed = BlogPostListResponseSchema.parse(response.data);

                const blogPosts = parsed.results.map(mapBlogPost);

                if (blogPosts.length > 0) {
                    await nango.batchSave(blogPosts, 'BlogPost');
                }

                const nextUrl = parsed._links?.next;
                if (!nextUrl) {
                    break;
                }

                cursor = extractCursorFromNextUrl(nextUrl);
                await nango.saveCheckpoint({
                    cursor,
                    spaceId: '',
                    spaceIndex: 0,
                    deleteTrackingStarted: true
                });
            }
        } else {
            for (let i = currentSpaceIndex; i < spaceIds.length; i++) {
                const spaceId = spaceIds[i];
                if (spaceId === undefined) {
                    continue;
                }

                let cursor = i === currentSpaceIndex ? currentCursor : '';

                while (true) {
                    const params: Record<string, string | number> = {
                        'body-format': 'storage',
                        limit: 100
                    };
                    if (cursor !== '') {
                        params['cursor'] = cursor;
                    }

                    // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#get-blog-posts-in-space
                    const response = await nango.get({
                        endpoint: `/wiki/api/v2/spaces/${spaceId}/blogposts`,
                        baseUrlOverride,
                        params,
                        retries: 3
                    });

                    const parsed = BlogPostListResponseSchema.parse(response.data);

                    const blogPosts = parsed.results.map(mapBlogPost);

                    if (blogPosts.length > 0) {
                        await nango.batchSave(blogPosts, 'BlogPost');
                    }

                    const nextUrl = parsed._links?.next;
                    if (!nextUrl) {
                        break;
                    }

                    cursor = extractCursorFromNextUrl(nextUrl);
                    await nango.saveCheckpoint({
                        cursor,
                        spaceId,
                        spaceIndex: i,
                        deleteTrackingStarted: true
                    });
                }

                await nango.saveCheckpoint({
                    cursor: '',
                    spaceId: '',
                    spaceIndex: i + 1,
                    deleteTrackingStarted: true
                });
            }
        }

        await nango.trackDeletesEnd('BlogPost');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
