import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const InputSchema = z.object({
    spaceId: z.string().describe('Space ID. Example: "123456"'),
    title: z.string().describe('Blog post title.'),
    status: z.string().describe('Blog post status. Example: "current" or "draft".'),
    body: z.string().describe('Blog post body in storage format.')
});

const ProviderBlogPostSchema = z.object({
    id: z.string(),
    status: z.string(),
    title: z.string(),
    spaceId: z.string(),
    authorId: z.string().optional(),
    createdAt: z.string().optional(),
    body: z
        .object({
            storage: z.unknown().optional(),
            atlas_doc_format: z.unknown().optional(),
            view: z.unknown().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    title: z.string(),
    spaceId: z.string(),
    authorId: z.string().optional(),
    createdAt: z.string().optional(),
    body: z
        .object({
            storage: z.unknown().optional(),
            atlas_doc_format: z.unknown().optional(),
            view: z.unknown().optional()
        })
        .optional()
});

const AccessibleResourceSchema = z.array(
    z.object({
        id: z.string()
    })
);

const action = createAction({
    description: 'Create a Confluence blog post in a space.',
    version: '1.0.1',
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write:page:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let cloudId = connection.connection_config?.['cloudId'];

        if (!cloudId) {
            const rawMetadata = await nango.getMetadata();
            if (rawMetadata && typeof rawMetadata === 'object') {
                const metadata = MetadataSchema.parse(rawMetadata);
                cloudId = metadata.cloudId;
            }
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#3-1-get-the-cloudid-for-your-site
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const accessibleResources = AccessibleResourceSchema.parse(accessibleResourcesResponse.data);
            if (accessibleResources.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_cloud_id',
                    message: 'No accessible Confluence resource found for this connection.'
                });
            }
            if (accessibleResources.length > 1) {
                throw new nango.ActionError({
                    type: 'ambiguous_cloud_id',
                    message: 'Multiple Confluence sites found. Please set an explicit cloudId in the connection metadata.'
                });
            }

            cloudId = accessibleResources[0]!.id;
            await nango.updateMetadata({ cloudId });
        }

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-post
        const createResponse = await nango.post({
            endpoint: '/wiki/api/v2/blogposts',
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            data: {
                spaceId: input.spaceId,
                status: input.status,
                title: input.title,
                body: {
                    representation: 'storage',
                    value: input.body
                }
            },
            retries: 10
        });

        const providerBlogPost = ProviderBlogPostSchema.parse(createResponse.data);

        return {
            id: providerBlogPost.id,
            status: providerBlogPost.status,
            title: providerBlogPost.title,
            spaceId: providerBlogPost.spaceId,
            ...(providerBlogPost.authorId !== undefined && { authorId: providerBlogPost.authorId }),
            ...(providerBlogPost.createdAt !== undefined && { createdAt: providerBlogPost.createdAt }),
            ...(providerBlogPost.body !== undefined && { body: providerBlogPost.body })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
