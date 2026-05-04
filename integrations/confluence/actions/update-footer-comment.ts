import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    comment_id: z.string().describe('The ID of the footer comment to update. Example: "123456"'),
    version_number: z.number().int().describe('The next version number for the comment. Example: 2'),
    body: z.string().describe('The updated comment body in storage format. Example: "<p>Updated comment</p>"'),
    version_message: z.string().optional().describe('An optional message describing the update.')
});

const ProviderBodyRepresentationSchema = z.object({
    representation: z.string().optional(),
    value: z.string().optional()
});

const ProviderVersionSchema = z.object({
    createdAt: z.string().optional(),
    message: z.string().optional(),
    number: z.number().optional(),
    minorEdit: z.boolean().optional(),
    authorId: z.string().optional()
});

const ProviderFooterCommentSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    pageId: z.string().optional(),
    blogPostId: z.string().optional(),
    attachmentId: z.string().optional(),
    customContentId: z.string().optional(),
    parentCommentId: z.string().optional(),
    version: ProviderVersionSchema.optional(),
    body: z
        .object({
            storage: ProviderBodyRepresentationSchema.optional(),
            atlas_doc_format: ProviderBodyRepresentationSchema.optional(),
            view: ProviderBodyRepresentationSchema.optional()
        })
        .optional()
});

const OutputSchema = z.object({
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
            number: z.number().optional(),
            message: z.string().optional(),
            createdAt: z.string().optional(),
            authorId: z.string().optional()
        })
        .optional(),
    body: z
        .object({
            representation: z.string().optional(),
            value: z.string().optional()
        })
        .optional()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const action = createAction({
    description: 'Update the body of a Confluence footer comment.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-footer-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['write:comment:confluence'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let cloudId: string | undefined;

        const metadata = await nango.getMetadata();
        const rawMetadataCloudId: unknown = metadata?.cloudId;
        if (typeof rawMetadataCloudId === 'string' && rawMetadataCloudId.length > 0) {
            cloudId = rawMetadataCloudId;
        }

        if (!cloudId) {
            const connection = await nango.getConnection();
            const rawConnectionConfig: unknown = connection.connection_config;
            const connectionConfigResult = z.record(z.string(), z.unknown()).safeParse(rawConnectionConfig);
            if (connectionConfigResult.success) {
                const rawCloudId: unknown = connectionConfigResult.data['cloudId'];
                if (typeof rawCloudId === 'string' && rawCloudId.length > 0) {
                    cloudId = rawCloudId;
                }
            }
        }

        if (!cloudId) {
            const accessibleResourcesResponse = await nango.get({
                // https://developer.atlassian.com/cloud/confluence/rest/v2/intro/
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const accessibleResources = z.array(z.object({ id: z.string() })).parse(accessibleResourcesResponse.data);
            if (!accessibleResources[0]) {
                throw new nango.ActionError({
                    type: 'cloud_id_not_found',
                    message: 'Could not resolve Confluence cloud ID from accessible resources.'
                });
            }

            cloudId = accessibleResources[0].id;
            await nango.updateMetadata({ cloudId });
        }

        const baseUrlOverride = `https://api.atlassian.com/ex/confluence/${cloudId}`;

        const updateResponse = await nango.put({
            // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-comment/#api-wiki-api-v2-footer-comments-comment-id-put
            endpoint: `/wiki/api/v2/footer-comments/${input.comment_id}`,
            baseUrlOverride,
            data: {
                version: {
                    number: input.version_number,
                    ...(input.version_message !== undefined && { message: input.version_message })
                },
                body: {
                    representation: 'storage',
                    value: input.body
                }
            },
            retries: 1
        });

        const providerComment = ProviderFooterCommentSchema.parse(updateResponse.data);

        return {
            id: providerComment.id,
            ...(providerComment.status !== undefined && { status: providerComment.status }),
            ...(providerComment.title !== undefined && { title: providerComment.title }),
            ...(providerComment.pageId !== undefined && { pageId: providerComment.pageId }),
            ...(providerComment.blogPostId !== undefined && { blogPostId: providerComment.blogPostId }),
            ...(providerComment.attachmentId !== undefined && { attachmentId: providerComment.attachmentId }),
            ...(providerComment.customContentId !== undefined && { customContentId: providerComment.customContentId }),
            ...(providerComment.parentCommentId !== undefined && { parentCommentId: providerComment.parentCommentId }),
            ...(providerComment.version !== undefined && {
                version: {
                    ...(providerComment.version.number !== undefined && { number: providerComment.version.number }),
                    ...(providerComment.version.message !== undefined && { message: providerComment.version.message }),
                    ...(providerComment.version.createdAt !== undefined && { createdAt: providerComment.version.createdAt }),
                    ...(providerComment.version.authorId !== undefined && { authorId: providerComment.version.authorId })
                }
            }),
            ...(providerComment.body !== undefined &&
                providerComment.body.storage !== undefined && {
                    body: {
                        ...(providerComment.body.storage.representation !== undefined && { representation: providerComment.body.storage.representation }),
                        ...(providerComment.body.storage.value !== undefined && { value: providerComment.body.storage.value })
                    }
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
