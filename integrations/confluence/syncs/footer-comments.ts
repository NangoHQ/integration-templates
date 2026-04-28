import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    cursor: z.string()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const VersionSchema = z.object({
    createdAt: z.string().optional(),
    message: z.string().optional(),
    number: z.number().optional(),
    minorEdit: z.boolean().optional(),
    authorId: z.string().optional()
});

const FooterCommentSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    pageId: z.string().optional(),
    blogPostId: z.string().optional(),
    attachmentId: z.string().optional(),
    customContentId: z.string().optional(),
    parentCommentId: z.string().optional(),
    version: VersionSchema.optional()
});

const AccessibleResourcesSchema = z.array(
    z.object({
        id: z.string()
    })
);

const FooterCommentsResponseSchema = z.object({
    results: z.array(
        z.object({
            id: z.string(),
            status: z.string().optional(),
            title: z.string().optional(),
            pageId: z.string().optional(),
            blogPostId: z.string().optional(),
            attachmentId: z.string().optional(),
            customContentId: z.string().optional(),
            parentCommentId: z.string().optional(),
            version: z
                .object({
                    createdAt: z.string().optional(),
                    message: z.string().optional(),
                    number: z.number().optional(),
                    minorEdit: z.boolean().optional(),
                    authorId: z.string().optional()
                })
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
        throw new Error('Confluence footer comments response included a next link without a cursor');
    }

    return cursor;
}

const sync = createSync({
    description: 'Sync Confluence footer comments visible to the connection',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/footer-comments'
        }
    ],
    scopes: ['read:comment:confluence'],
    metadata: MetadataSchema,
    models: {
        FooterComment: FooterCommentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let cursor = checkpoint && checkpoint['cursor'] ? checkpoint['cursor'] : '';

        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;

        let cloudId: string | undefined;
        if (connectionConfig && typeof connectionConfig === 'object') {
            const rawCloudId = connectionConfig['cloudId'];
            if (typeof rawCloudId === 'string') {
                cloudId = rawCloudId;
            }
        }

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            const parsedMetadata = MetadataSchema.safeParse(metadata || {});
            if (parsedMetadata.success && parsedMetadata.data.cloudId) {
                cloudId = parsedMetadata.data.cloudId;
            }
        }

        if (!cloudId) {
            const resourcesResponse = await nango.get({
                // https://developer.atlassian.com/cloud/confluence/rest/v2/intro/#auth
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const parsedResources = AccessibleResourcesSchema.safeParse(resourcesResponse.data);
            if (!parsedResources.success || parsedResources.data.length === 0) {
                await nango.log('Could not resolve Confluence cloudId from accessible-resources');
                return;
            }

            const firstResource = parsedResources.data[0];
            if (!firstResource) {
                await nango.log('Could not resolve Confluence cloudId from accessible-resources');
                return;
            }
            cloudId = firstResource.id;
            await nango.updateMetadata({ cloudId });
        }

        if (!cursor) {
            await nango.trackDeletesStart('FooterComment');
        }

        const baseUrlOverride = `https://api.atlassian.com/ex/confluence/${cloudId}`;
        const limit = 100;

        while (true) {
            const params: Record<string, string | number> = { limit };
            if (cursor) {
                params['cursor'] = cursor;
            }

            const response = await nango.get({
                // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-comment/#api-footer-comments-get
                endpoint: '/wiki/api/v2/footer-comments',
                params,
                baseUrlOverride,
                retries: 3
            });

            const parsedBody = FooterCommentsResponseSchema.parse(response.data);

            const comments = parsedBody.results.map((comment) => ({
                id: comment.id,
                ...(comment.status !== undefined && { status: comment.status }),
                ...(comment.title !== undefined && { title: comment.title }),
                ...(comment.pageId !== undefined && { pageId: comment.pageId }),
                ...(comment.blogPostId !== undefined && { blogPostId: comment.blogPostId }),
                ...(comment.attachmentId !== undefined && { attachmentId: comment.attachmentId }),
                ...(comment.customContentId !== undefined && { customContentId: comment.customContentId }),
                ...(comment.parentCommentId !== undefined && { parentCommentId: comment.parentCommentId }),
                ...(comment.version !== undefined && {
                    version: {
                        ...(comment.version.createdAt !== undefined && { createdAt: comment.version.createdAt }),
                        ...(comment.version.message !== undefined && { message: comment.version.message }),
                        ...(comment.version.number !== undefined && { number: comment.version.number }),
                        ...(comment.version.minorEdit !== undefined && { minorEdit: comment.version.minorEdit }),
                        ...(comment.version.authorId !== undefined && { authorId: comment.version.authorId })
                    }
                })
            }));

            if (comments.length > 0) {
                await nango.batchSave(comments, 'FooterComment');
            }

            const nextLink = parsedBody._links?.next;
            if (!nextLink) {
                break;
            }

            cursor = extractCursorFromNextUrl(nextLink);
            await nango.saveCheckpoint({ cursor });
        }

        await nango.trackDeletesEnd('FooterComment');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
