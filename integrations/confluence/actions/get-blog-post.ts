import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Blog post ID. Example: "123456"'),
    include_labels: z.boolean().optional().describe('Include labels in the response.'),
    include_properties: z.boolean().optional().describe('Include content properties in the response.'),
    include_operations: z.boolean().optional().describe('Include operations in the response.'),
    include_likes: z.boolean().optional().describe('Include likes in the response.'),
    include_versions: z.boolean().optional().describe('Include version history in the response.')
});

const ProviderBlogPostSchema = z
    .object({
        id: z.string(),
        status: z.string().optional(),
        title: z.string().optional(),
        spaceId: z.string().optional(),
        authorId: z.string().optional(),
        createdAt: z.string().optional(),
        blogPostId: z.string().optional(),
        version: z
            .object({
                createdAt: z.string().optional(),
                message: z.string().optional(),
                number: z.number().optional()
            })
            .optional(),
        parent: z.object({ id: z.string(), status: z.string().optional() }).optional(),
        body: z
            .object({
                storage: z
                    .object({
                        value: z.string().optional(),
                        representation: z.string().optional()
                    })
                    .optional()
            })
            .optional(),
        labels: z.array(z.unknown()).optional(),
        properties: z.record(z.string(), z.unknown()).optional(),
        likes: z.object({ count: z.number().optional() }).optional(),
        _expandable: z.record(z.string(), z.unknown()).optional(),
        _links: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    spaceId: z.string().optional(),
    authorId: z.string().optional(),
    createdAt: z.string().optional(),
    blogPostId: z.string().optional(),
    version: z
        .object({
            createdAt: z.string().optional(),
            message: z.string().optional(),
            number: z.number().optional()
        })
        .optional(),
    parent: z.object({ id: z.string(), status: z.string().optional() }).optional(),
    body: z
        .object({
            storage: z
                .object({
                    value: z.string().optional(),
                    representation: z.string().optional()
                })
                .optional()
        })
        .optional(),
    labels: z.array(z.unknown()).optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    likes: z.object({ count: z.number().optional() }).optional()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

function buildIncludeParam(input: z.infer<typeof InputSchema>): string | undefined {
    const parts: string[] = [];
    if (input.include_labels) {
        parts.push('labels');
    }
    if (input.include_properties) {
        parts.push('properties');
    }
    if (input.include_operations) {
        parts.push('operations');
    }
    if (input.include_likes) {
        parts.push('likes');
    }
    if (input.include_versions) {
        parts.push('versions');
    }
    if (parts.length > 0) {
        return parts.join(',');
    }
    return undefined;
}

const AccessibleResourceSchema = z.array(
    z
        .object({
            id: z.string()
        })
        .passthrough()
);

const action = createAction({
    description: 'Retrieve a Confluence blog post by id.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-blog-post',
        group: 'Blog Posts'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['read:page:confluence', 'read:space:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connectionResponse = await nango.getConnection();
        const connection = connectionResponse;
        const configCloudId =
            connection.connection_config !== null &&
            typeof connection.connection_config === 'object' &&
            'cloudId' in connection.connection_config &&
            typeof connection.connection_config['cloudId'] === 'string'
                ? connection.connection_config['cloudId']
                : undefined;
        let cloudId: string | undefined;
        if (typeof configCloudId === 'string' && configCloudId) {
            cloudId = configCloudId;
        }

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            if (metadata && typeof metadata === 'object' && 'cloudId' in metadata && typeof metadata['cloudId'] === 'string' && metadata['cloudId']) {
                cloudId = metadata['cloudId'];
            }
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/rest/v2/intro/#base-url
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resources = AccessibleResourceSchema.parse(accessibleResourcesResponse.data);
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
            await nango.updateMetadata({ cloudId });
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'Unable to resolve Confluence cloud ID from connection config or accessible resources.'
            });
        }

        const include = buildIncludeParam(input);
        const params: Record<string, string> = {
            'body-format': 'storage'
        };
        if (include) {
            params['include'] = include;
        }

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-id-get
        const response = await nango.get({
            endpoint: `/wiki/api/v2/blogposts/${input.id}`,
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Blog post not found: ${input.id}`
            });
        }

        const blogPost = ProviderBlogPostSchema.parse(response.data);

        return {
            id: blogPost.id,
            ...(blogPost.status !== undefined && { status: blogPost.status }),
            ...(blogPost.title !== undefined && { title: blogPost.title }),
            ...(blogPost.spaceId !== undefined && { spaceId: blogPost.spaceId }),
            ...(blogPost.authorId !== undefined && { authorId: blogPost.authorId }),
            ...(blogPost.createdAt !== undefined && { createdAt: blogPost.createdAt }),
            ...(blogPost.blogPostId !== undefined && { blogPostId: blogPost.blogPostId }),
            ...(blogPost.version !== undefined && { version: blogPost.version }),
            ...(blogPost.parent !== undefined && { parent: blogPost.parent }),
            ...(blogPost.body !== undefined && { body: blogPost.body }),
            ...(blogPost.labels !== undefined && { labels: blogPost.labels }),
            ...(blogPost.properties !== undefined && { properties: blogPost.properties }),
            ...(blogPost.likes !== undefined && { likes: blogPost.likes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
