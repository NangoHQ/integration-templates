import { createSync } from 'nango';
import { z } from 'zod';

const AttachmentSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    createdAt: z.string().optional(),
    pageId: z.string().optional(),
    blogPostId: z.string().optional(),
    customContentId: z.string().optional(),
    mediaType: z.string().optional(),
    mediaTypeDescription: z.string().optional(),
    comment: z.string().optional(),
    fileId: z.string().optional(),
    fileSize: z.number().optional(),
    webuiLink: z.string().optional(),
    downloadLink: z.string().optional()
});

const ProviderAttachmentSchema = z.object({
    id: z.string(),
    status: z.string().nullish(),
    title: z.string().nullish(),
    createdAt: z.string().nullish(),
    pageId: z.string().nullish(),
    blogPostId: z.string().nullish(),
    customContentId: z.string().nullish(),
    mediaType: z.string().nullish(),
    mediaTypeDescription: z.string().nullish(),
    comment: z.string().nullish(),
    fileId: z.string().nullish(),
    fileSize: z.number().nullish(),
    webuiLink: z.string().nullish(),
    downloadLink: z.string().nullish()
});

const AccessibleResourcesSchema = z.array(
    z.object({
        id: z.string()
    })
);

const MetadataSchema = z.object({
    cloudId: z.string().optional(),
    mediaType: z.string().optional(),
    filename: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const AttachmentListResponseSchema = z.object({
    results: z.array(ProviderAttachmentSchema),
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
        throw new Error('Confluence attachments response included a next link without a cursor');
    }

    return cursor;
}

const sync = createSync({
    description: 'Sync Confluence attachment metadata across accessible content',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/attachments' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        Attachment: AttachmentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let cursor = checkpoint?.cursor ?? '';

        const connection = await nango.getConnection();
        let cloudId: string | undefined;

        const connectionConfig = connection.connection_config;
        if (connectionConfig && typeof connectionConfig === 'object' && 'cloudId' in connectionConfig && typeof connectionConfig['cloudId'] === 'string') {
            cloudId = connectionConfig['cloudId'];
        }

        const metadata = await nango.getMetadata();
        if (!cloudId && metadata && typeof metadata === 'object' && 'cloudId' in metadata && typeof metadata['cloudId'] === 'string') {
            cloudId = metadata['cloudId'];
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/rest/v2/intro/#authentication
            const resourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const parsed = AccessibleResourcesSchema.safeParse(resourcesResponse.data);
            if (!parsed.success) {
                await nango.log('Failed to parse accessible resources');
                return;
            }

            for (const resource of parsed.data) {
                cloudId = resource.id;
                break;
            }
            if (!cloudId) {
                await nango.log('No accessible Confluence resources found');
                return;
            }

            await nango.updateMetadata({ cloudId });
        }
        const params: Record<string, string | number> = {
            limit: 100
        };
        if (metadata && typeof metadata === 'object') {
            if ('mediaType' in metadata && typeof metadata['mediaType'] === 'string') {
                params['mediaType'] = metadata['mediaType'];
            }
            if ('filename' in metadata && typeof metadata['filename'] === 'string') {
                params['filename'] = metadata['filename'];
            }
        }

        // Blocker: Confluence v2 attachments endpoint has no changed-since filter,
        // no changed-records endpoint, and modified-date sort has known 500 errors.
        if (!cursor) {
            await nango.trackDeletesStart('Attachment');
        }

        while (true) {
            const response = await nango.get({
                // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/#api-attachments-get
                endpoint: '/wiki/api/v2/attachments',
                baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
                params: {
                    ...params,
                    ...(cursor ? { cursor } : {})
                },
                retries: 3
            });

            const parsedResponse = AttachmentListResponseSchema.parse(response.data);
            const attachments = [];
            for (const item of parsedResponse.results) {
                const parsed = ProviderAttachmentSchema.safeParse(item);
                if (!parsed.success) {
                    continue;
                }
                const record = parsed.data;
                attachments.push({
                    id: record.id,
                    ...(record.status != null && { status: record.status }),
                    ...(record.title != null && { title: record.title }),
                    ...(record.createdAt != null && { createdAt: record.createdAt }),
                    ...(record.pageId != null && { pageId: record.pageId }),
                    ...(record.blogPostId != null && { blogPostId: record.blogPostId }),
                    ...(record.customContentId != null && { customContentId: record.customContentId }),
                    ...(record.mediaType != null && { mediaType: record.mediaType }),
                    ...(record.mediaTypeDescription != null && { mediaTypeDescription: record.mediaTypeDescription }),
                    ...(record.comment != null && { comment: record.comment }),
                    ...(record.fileId != null && { fileId: record.fileId }),
                    ...(record.fileSize != null && { fileSize: record.fileSize }),
                    ...(record.webuiLink != null && { webuiLink: record.webuiLink }),
                    ...(record.downloadLink != null && { downloadLink: record.downloadLink })
                });
            }

            if (attachments.length > 0) {
                await nango.batchSave(attachments, 'Attachment');
            }

            const nextUrl = parsedResponse._links?.next;
            if (!nextUrl) {
                break;
            }

            cursor = extractCursorFromNextUrl(nextUrl);
            await nango.saveCheckpoint({ cursor });
        }

        await nango.trackDeletesEnd('Attachment');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
