import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageId: z.string().optional().describe('Page ID to comment on. Example: "12345678"'),
    blogPostId: z.string().optional().describe('Blog post ID to comment on. Example: "12345678"'),
    attachmentId: z.string().optional().describe('Attachment ID to comment on. Example: "12345678"'),
    parentCommentId: z.string().optional().describe('Parent comment ID to reply to. Example: "12345678"'),
    customContentId: z.string().optional().describe('Custom content ID to comment on. Example: "12345678"'),
    bodyValue: z.string().describe('Comment body in Confluence storage format. Example: "<p>Hello world</p>"')
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const AccessibleResourceSchema = z.object({
    id: z.string()
});

const AccessibleResourcesSchema = z.array(AccessibleResourceSchema);

const ProviderResponseSchema = z.object({
    id: z.string(),
    status: z.string(),
    title: z.string().optional(),
    pageId: z.string().optional(),
    blogPostId: z.string().optional(),
    attachmentId: z.string().optional(),
    parentCommentId: z.string().optional(),
    customContentId: z.string().optional(),
    version: z
        .object({
            createdAt: z.string().optional(),
            message: z.string().optional(),
            number: z.number(),
            minorEdit: z.boolean().optional(),
            authorId: z.string().optional()
        })
        .optional(),
    body: z
        .object({
            storage: z
                .object({
                    representation: z.string().optional(),
                    value: z.string().optional()
                })
                .optional()
        })
        .optional(),
    _links: z
        .object({
            webui: z.string().optional(),
            base: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    title: z.string().optional(),
    pageId: z.string().optional(),
    blogPostId: z.string().optional(),
    attachmentId: z.string().optional(),
    parentCommentId: z.string().optional(),
    customContentId: z.string().optional(),
    version: z
        .object({
            createdAt: z.string().optional(),
            message: z.string().optional(),
            number: z.number(),
            minorEdit: z.boolean().optional(),
            authorId: z.string().optional()
        })
        .optional(),
    body: z
        .object({
            storage: z
                .object({
                    representation: z.string().optional(),
                    value: z.string().optional()
                })
                .optional()
        })
        .optional(),
    links: z
        .object({
            webui: z.string().optional(),
            base: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a footer comment on a page, blog post, attachment, or comment thread.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-footer-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['write:comment:confluence', 'read:page:confluence', 'read:blogpost:confluence', 'read:attachment:confluence', 'read:comment:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let targetKey: string | undefined;
        let targetValue: string | undefined;

        if (input.pageId !== undefined) {
            targetKey = 'pageId';
            targetValue = input.pageId;
        }
        if (input.blogPostId !== undefined) {
            if (targetKey !== undefined) {
                throw new nango.ActionError({
                    type: 'multiple_targets',
                    message: 'Only one of pageId, blogPostId, attachmentId, parentCommentId, or customContentId may be provided.'
                });
            }
            targetKey = 'blogPostId';
            targetValue = input.blogPostId;
        }
        if (input.attachmentId !== undefined) {
            if (targetKey !== undefined) {
                throw new nango.ActionError({
                    type: 'multiple_targets',
                    message: 'Only one of pageId, blogPostId, attachmentId, parentCommentId, or customContentId may be provided.'
                });
            }
            targetKey = 'attachmentId';
            targetValue = input.attachmentId;
        }
        if (input.parentCommentId !== undefined) {
            if (targetKey !== undefined) {
                throw new nango.ActionError({
                    type: 'multiple_targets',
                    message: 'Only one of pageId, blogPostId, attachmentId, parentCommentId, or customContentId may be provided.'
                });
            }
            targetKey = 'parentCommentId';
            targetValue = input.parentCommentId;
        }
        if (input.customContentId !== undefined) {
            if (targetKey !== undefined) {
                throw new nango.ActionError({
                    type: 'multiple_targets',
                    message: 'Only one of pageId, blogPostId, attachmentId, parentCommentId, or customContentId may be provided.'
                });
            }
            targetKey = 'customContentId';
            targetValue = input.customContentId;
        }

        if (targetKey === undefined || targetValue === undefined) {
            throw new nango.ActionError({
                type: 'missing_target',
                message: 'Exactly one of pageId, blogPostId, attachmentId, parentCommentId, or customContentId is required.'
            });
        }

        const connection = await nango.getConnection();

        let cloudId: string | undefined;

        if (connection.connection_config && typeof connection.connection_config === 'object' && 'cloudId' in connection.connection_config) {
            const configValue = connection.connection_config['cloudId'];
            if (typeof configValue === 'string') {
                cloudId = configValue;
            }
        }

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            if (metadata && typeof metadata === 'object' && 'cloudId' in metadata) {
                const metaValue = metadata['cloudId'];
                if (typeof metaValue === 'string') {
                    cloudId = metaValue;
                }
            }
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/rest/v2/intro/#auth
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resources = AccessibleResourcesSchema.safeParse(accessibleResourcesResponse.data);
            if (!resources.success || resources.data.length === 0) {
                throw new nango.ActionError({
                    type: 'cloud_id_not_found',
                    message: 'Unable to resolve Confluence cloud ID from accessible resources.'
                });
            }
            if (resources.data.length > 1) {
                throw new nango.ActionError({
                    type: 'ambiguous_cloud_id',
                    message: 'Multiple Confluence sites found. Please set an explicit cloudId in the connection metadata.'
                });
            }

            cloudId = resources.data[0]!.id;

            await nango.updateMetadata({ cloudId });
        }

        const requestBody: Record<string, unknown> = {
            [targetKey]: targetValue,
            body: {
                representation: 'storage',
                value: input.bodyValue
            }
        };

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-comment/#api-footer-comments-post
        const response = await nango.post({
            endpoint: '/wiki/api/v2/footer-comments',
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            data: requestBody,
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Confluence API when creating footer comment.'
            });
        }

        const data = providerResponse.data;

        return {
            id: data.id,
            status: data.status,
            ...(data.title !== undefined && { title: data.title }),
            ...(data.pageId !== undefined && { pageId: data.pageId }),
            ...(data.blogPostId !== undefined && { blogPostId: data.blogPostId }),
            ...(data.attachmentId !== undefined && { attachmentId: data.attachmentId }),
            ...(data.parentCommentId !== undefined && { parentCommentId: data.parentCommentId }),
            ...(data.customContentId !== undefined && { customContentId: data.customContentId }),
            ...(data.version !== undefined && { version: data.version }),
            ...(data.body !== undefined && { body: data.body }),
            ...(data._links !== undefined && {
                links: {
                    ...(data._links.webui !== undefined && { webui: data._links.webui }),
                    ...(data._links.base !== undefined && { base: data._links.base })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
