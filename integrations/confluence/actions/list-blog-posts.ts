import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    spaceId: z.string().optional().describe('Space ID filter.'),
    status: z.string().optional().describe('Status filter, e.g. current.'),
    title: z.string().optional().describe('Title filter.'),
    sort: z.string().optional().describe('Sort order, e.g. created-date desc.'),
    bodyFormat: z.string().optional().describe('Body format representation. Defaults to storage.'),
    limit: z.number().int().min(1).max(250).optional().describe('Maximum number of results per page.')
});

const ProviderVersionSchema = z.object({
    createdAt: z.string().optional(),
    message: z.string().optional(),
    number: z.number().optional(),
    minorEdit: z.boolean().optional(),
    authorId: z.string().optional()
});

const ProviderBodySchema = z.object({
    storage: z.unknown().optional(),
    atlas_doc_format: z.unknown().optional(),
    view: z.unknown().optional()
});

const ProviderItemLinksSchema = z.object({
    webui: z.string().optional(),
    editui: z.string().optional(),
    tinyui: z.string().optional()
});

const ProviderBlogPostSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    spaceId: z.string().optional(),
    authorId: z.string().optional(),
    createdAt: z.string().optional(),
    version: ProviderVersionSchema.optional(),
    body: ProviderBodySchema.optional(),
    _links: ProviderItemLinksSchema.optional()
});

const ProviderResponseSchema = z.object({
    results: z.array(ProviderBlogPostSchema),
    _links: z
        .object({
            next: z.string().optional(),
            base: z.string().optional()
        })
        .optional()
});

const BlogPostSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    spaceId: z.string().optional(),
    authorId: z.string().optional(),
    createdAt: z.string().optional(),
    version: ProviderVersionSchema.optional(),
    body: ProviderBodySchema.optional(),
    _links: ProviderItemLinksSchema.optional()
});

const OutputSchema = z.object({
    results: z.array(BlogPostSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Confluence blog posts with pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-blog-posts',
        group: 'Blog Posts'
    },
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:page:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = z.record(z.string(), z.unknown()).parse(connection.connection_config ?? {});
        let cloudId = typeof connectionConfig['cloudId'] === 'string' ? connectionConfig['cloudId'] : undefined;

        if (!cloudId) {
            const metadata = MetadataSchema.parse((await nango.getMetadata()) ?? {});
            cloudId = metadata.cloudId;
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/rest/v2/intro/#auth
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const accessibleResourcesSchema = z.array(
                z
                    .object({
                        id: z.string()
                    })
                    .passthrough()
            );
            const accessibleResources = accessibleResourcesSchema.parse(accessibleResourcesResponse.data);
            if (accessibleResources.length === 0) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Confluence resources found for this connection.'
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

        const baseUrl = `https://api.atlassian.com/ex/confluence/${cloudId}`;

        const params = {
            'body-format': input.bodyFormat ?? 'storage',
            ...(input.cursor !== undefined && { cursor: input.cursor }),
            ...(input.spaceId !== undefined && { 'space-id': input.spaceId }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.title !== undefined && { title: input.title }),
            ...(input.sort !== undefined && { sort: input.sort }),
            ...(input.limit !== undefined && { limit: input.limit })
        };

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blogposts-get
        const response = await nango.get({
            endpoint: '/wiki/api/v2/blogposts',
            baseUrlOverride: baseUrl,
            params,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        const nextLink = providerData._links?.next;
        if (nextLink) {
            // @allowTryCatch
            try {
                const nextUrl = new URL(nextLink, baseUrl);
                const cursor = nextUrl.searchParams.get('cursor');
                if (cursor) {
                    nextCursor = cursor;
                }
            } catch {
                // ignore malformed URL
            }
        }

        if (!nextCursor && typeof response.headers?.['link'] === 'string') {
            const parts = response.headers['link'].split(',');
            for (const part of parts) {
                const match = part.match(/<([^>]+)>;\s*rel="next"/);
                if (match && match[1]) {
                    // @allowTryCatch
                    try {
                        const nextUrl = new URL(match[1], baseUrl);
                        const cursor = nextUrl.searchParams.get('cursor');
                        if (cursor) {
                            nextCursor = cursor;
                            break;
                        }
                    } catch {
                        // ignore malformed URL
                    }
                }
            }
        }

        return {
            results: providerData.results.map((post) => ({
                id: post.id,
                ...(post.status !== undefined && { status: post.status }),
                ...(post.title !== undefined && { title: post.title }),
                ...(post.spaceId !== undefined && { spaceId: post.spaceId }),
                ...(post.authorId !== undefined && { authorId: post.authorId }),
                ...(post.createdAt !== undefined && { createdAt: post.createdAt }),
                ...(post.version !== undefined && { version: post.version }),
                ...(post.body !== undefined && { body: post.body }),
                ...(post._links !== undefined && { _links: post._links })
            })),
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
