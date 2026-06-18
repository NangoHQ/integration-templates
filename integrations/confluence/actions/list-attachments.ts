import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    filename: z.string().optional().describe('Filter by attachment filename.'),
    mediaType: z.string().optional().describe('Filter by media type (MIME type).'),
    status: z.string().optional().describe('Filter by attachment status (e.g., current, trashed).')
});

const VersionSchema = z.object({
    createdAt: z.string().optional(),
    message: z.string().optional(),
    number: z.number().optional(),
    minorEdit: z.boolean().optional(),
    authorId: z.string().optional()
});

const AttachmentSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    createdAt: z.string().optional(),
    pageId: z.string().optional(),
    blogPostId: z.string().optional(),
    customContentId: z.string().optional(),
    mediaType: z.string().optional(),
    mediaTypeDescription: z.string().nullable().optional(),
    comment: z.string().optional(),
    fileId: z.string().optional(),
    fileSize: z.number().optional(),
    webuiLink: z.string().optional(),
    downloadLink: z.string().optional(),
    version: VersionSchema.optional(),
    _links: z
        .object({
            webui: z.string().optional(),
            download: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    results: z.array(AttachmentSchema),
    _links: z
        .object({
            next: z.string().optional(),
            base: z.string().optional()
        })
        .optional()
});

const OutputItemSchema = z.object({
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
    downloadLink: z.string().optional(),
    version: VersionSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List Confluence attachments across accessible content.',
    version: '1.0.1',
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:attachment:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        let cloudId: string | undefined;

        if (connectionConfig && typeof connectionConfig === 'object' && 'cloudId' in connectionConfig && typeof connectionConfig['cloudId'] === 'string') {
            cloudId = connectionConfig['cloudId'];
        }

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            if (metadata && typeof metadata === 'object' && 'cloudId' in metadata && typeof metadata.cloudId === 'string') {
                cloudId = metadata.cloudId;
            }
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/rest/v2/intro/#auth
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const accessibleResourcesData = accessibleResourcesResponse.data;
            if (!accessibleResourcesData || !Array.isArray(accessibleResourcesData) || accessibleResourcesData.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_cloud_id',
                    message: 'Unable to resolve Confluence cloudId from connection config or accessible resources.'
                });
            }
            if (accessibleResourcesData.length > 1) {
                throw new nango.ActionError({
                    type: 'ambiguous_cloud_id',
                    message: 'Multiple Confluence sites found. Please set an explicit cloudId in the connection metadata.'
                });
            }

            const firstResource = accessibleResourcesData[0];
            if (!firstResource || typeof firstResource !== 'object' || !('id' in firstResource) || typeof firstResource.id !== 'string') {
                throw new nango.ActionError({
                    type: 'missing_cloud_id',
                    message: 'Accessible resources response did not contain a valid id.'
                });
            }

            cloudId = firstResource.id;

            await nango.updateMetadata({ cloudId });
        }

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/#api-attachments-get
        const response = await nango.get({
            endpoint: '/wiki/api/v2/attachments',
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.filename !== undefined && { filename: input.filename }),
                ...(input.mediaType !== undefined && { mediaType: input.mediaType }),
                ...(input.status !== undefined && { status: input.status }),
                limit: 250
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response does not match expected schema.'
            });
        }

        const data = parsed.data;

        const items = data.results.map((item) => ({
            id: item.id,
            ...(item.status !== undefined && { status: item.status }),
            ...(item.title !== undefined && { title: item.title }),
            ...(item.createdAt !== undefined && { createdAt: item.createdAt }),
            ...(item.pageId !== undefined && { pageId: item.pageId }),
            ...(item.blogPostId !== undefined && { blogPostId: item.blogPostId }),
            ...(item.customContentId !== undefined && { customContentId: item.customContentId }),
            ...(item.mediaType !== undefined && { mediaType: item.mediaType }),
            ...(item.mediaTypeDescription != null && { mediaTypeDescription: item.mediaTypeDescription }),
            ...(item.comment !== undefined && { comment: item.comment }),
            ...(item.fileId !== undefined && { fileId: item.fileId }),
            ...(item.fileSize !== undefined && { fileSize: item.fileSize }),
            ...(item.webuiLink !== undefined && { webuiLink: item.webuiLink }),
            ...(item.downloadLink !== undefined && { downloadLink: item.downloadLink }),
            ...(item.version !== undefined && { version: item.version })
        }));

        const rawNext = data._links?.next;
        return {
            items,
            ...(rawNext !== undefined && {
                next_cursor: (() => {
                    const u = new URL(rawNext, 'https://dummy');
                    return u.searchParams.get('cursor') ?? rawNext;
                })()
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
