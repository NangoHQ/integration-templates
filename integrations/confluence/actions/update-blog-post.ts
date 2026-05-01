import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Blog post ID. Example: "123456"'),
    title: z.string().optional().describe('New title for the blog post'),
    status: z.enum(['current', 'draft']).optional().describe('New status for the blog post'),
    body: z.string().optional().describe('New body content in storage format')
});

const AccessibleResourceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    avatarUrl: z.string().optional()
});

const BlogPostVersionSchema = z.object({
    number: z.number()
});

const BlogPostBodySchema = z.object({
    storage: z
        .object({
            representation: z.string().optional(),
            value: z.string().optional()
        })
        .optional()
});

const BlogPostSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    body: BlogPostBodySchema.optional(),
    version: BlogPostVersionSchema.optional(),
    spaceId: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    status: z.string().optional(),
    body: z.string().optional(),
    versionNumber: z.number().optional(),
    spaceId: z.string().optional()
});

const action = createAction({
    description: 'Update a Confluence blog post by id.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-blog-post',
        group: 'Blog Posts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write:page:confluence', 'read:page:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let cloudId: string | undefined;
        if (connection.connection_config && typeof connection.connection_config['cloudId'] === 'string') {
            cloudId = connection.connection_config['cloudId'];
        }

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            const MetadataSchema = z.object({
                cloudId: z.string().optional()
            });
            const parsedMetadata = MetadataSchema.safeParse(metadata);
            if (parsedMetadata.success && parsedMetadata.data.cloudId) {
                cloudId = parsedMetadata.data.cloudId;
            }
        }

        if (!cloudId) {
            const resourcesResponse = await nango.get({
                // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#accessing-data-on-behalf-of-the-user
                endpoint: '/oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resources = z.array(AccessibleResourceSchema).parse(resourcesResponse.data);
            if (resources.length === 0) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Confluence resources found for this connection.'
                });
            }
            if (resources.length > 1) {
                throw new nango.ActionError({
                    type: 'ambiguous_cloud_id',
                    message: 'Multiple Confluence sites found. Please set an explicit cloudId in the connection metadata.'
                });
            }
            cloudId = resources[0]!.id;
            // @ts-expect-error nango.updateMetadata is available at runtime but not in current type definitions.
            await nango.updateMetadata({ cloudId });
        }

        const baseUrl = `https://api.atlassian.com/ex/confluence/${cloudId}`;

        const getResponse = await nango.get({
            // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-get
            endpoint: `/wiki/api/v2/blogposts/${input.id}`,
            params: {
                'body-format': 'storage'
            },
            baseUrlOverride: baseUrl,
            retries: 3
        });

        const currentPost = BlogPostSchema.parse(getResponse.data);
        const currentVersion = currentPost.version?.number;
        if (typeof currentVersion !== 'number') {
            throw new nango.ActionError({
                type: 'missing_version',
                message: 'Could not determine current version of the blog post.'
            });
        }

        const updateBody: {
            id: string;
            status: string;
            title: string;
            body: { representation: string; value: string };
            version: { number: number };
        } = {
            id: input.id,
            status: input.status ?? currentPost.status ?? 'current',
            title: input.title ?? currentPost.title ?? '',
            body: {
                representation: 'storage',
                value: input.body ?? currentPost.body?.storage?.value ?? ''
            },
            version: {
                number: currentVersion + 1
            }
        };

        const putResponse = await nango.put({
            // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-put
            endpoint: `/wiki/api/v2/blogposts/${input.id}`,
            data: updateBody,
            baseUrlOverride: baseUrl,
            retries: 1
        });

        const updatedPost = BlogPostSchema.parse(putResponse.data);
        return {
            id: updatedPost.id,
            ...(updatedPost.title != null && { title: updatedPost.title }),
            ...(updatedPost.status != null && { status: updatedPost.status }),
            ...(updatedPost.body?.storage?.value != null && { body: updatedPost.body.storage.value }),
            ...(updatedPost.version?.number != null && {
                versionNumber: updatedPost.version.number
            }),
            ...(updatedPost.spaceId != null && { spaceId: updatedPost.spaceId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
