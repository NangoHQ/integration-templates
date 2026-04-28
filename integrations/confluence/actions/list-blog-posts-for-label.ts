import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    label_id: z.string().describe('Label ID. Example: "123456"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of results to return per page. Example: 25'),
    space_ids: z.array(z.string()).optional().describe('Optional space IDs to filter results.'),
    sort: z.string().optional().describe('Sort order for results.'),
    body_format: z.string().optional().describe("Body format for content. Defaults to 'storage'.")
});

const BlogPostSchema = z
    .object({
        id: z.string(),
        status: z.string().optional(),
        title: z.string().optional(),
        spaceId: z.string().optional(),
        authorId: z.string().optional(),
        createdAt: z.string().optional(),
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
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    results: z.array(BlogPostSchema).optional(),
    _links: z
        .object({
            next: z.string().optional(),
            base: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    results: z.array(BlogPostSchema),
    next_cursor: z.string().optional()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

function extractCursorFromNextUrl(nextUrl: string): string | undefined {
    const match = nextUrl.match(/[?&]cursor=([^&]+)/);
    if (match && match[1]) {
        return decodeURIComponent(match[1]);
    }
    return undefined;
}

const action = createAction({
    description: 'List Confluence blog posts attached to a label.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-blog-posts-for-label',
        group: 'Blog Posts'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['read:page:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = z
            .object({})
            .passthrough()
            .parse(connection.connection_config || {});
        const rawCloudId = connectionConfig['cloudId'];
        let cloudId: string;

        if (typeof rawCloudId === 'string' && rawCloudId.length > 0) {
            cloudId = rawCloudId;
        } else {
            const metadata = await nango.getMetadata();
            const parsedMetadata = MetadataSchema.safeParse(metadata);
            const metadataCloudId = parsedMetadata.success ? parsedMetadata.data['cloudId'] : undefined;

            if (typeof metadataCloudId === 'string' && metadataCloudId.length > 0) {
                cloudId = metadataCloudId;
            } else {
                // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/#implementing-oauth-2-0--3lo-
                const accessibleResourcesResponse = await nango.get({
                    endpoint: 'oauth/token/accessible-resources',
                    baseUrlOverride: 'https://api.atlassian.com',
                    retries: 3
                });

                const accessibleResources = z.array(z.object({}).passthrough()).parse(accessibleResourcesResponse.data || []);
                const firstResource = accessibleResources[0];
                if (!firstResource || typeof firstResource['id'] !== 'string') {
                    throw new nango.ActionError({
                        type: 'cloud_id_not_found',
                        message: 'Could not resolve Confluence cloud ID from connection or accessible resources.'
                    });
                }

                cloudId = firstResource['id'];
                await nango.updateMetadata({ cloudId });
            }
        }

        const baseUrlOverride = `https://api.atlassian.com/ex/confluence/${cloudId}`;

        const params: Record<string, string | number | string[] | number[]> = {};
        if (input.cursor !== undefined && input.cursor.length > 0) {
            params['cursor'] = input.cursor;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.space_ids !== undefined && input.space_ids.length > 0) {
            params['space-id'] = input.space_ids;
        }
        if (input.sort !== undefined && input.sort.length > 0) {
            params['sort'] = input.sort;
        }
        if (input.body_format !== undefined && input.body_format.length > 0) {
            params['body-format'] = input.body_format;
        } else {
            params['body-format'] = 'storage';
        }

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/#api-blog-post-get-blog-posts-for-label
        const response = await nango.get({
            endpoint: `/wiki/api/v2/labels/${input.label_id}/blogposts`,
            baseUrlOverride,
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data || {});
        const results = providerResponse.results || [];

        let nextCursor: string | undefined;
        if (providerResponse._links && typeof providerResponse._links.next === 'string' && providerResponse._links.next.length > 0) {
            nextCursor = extractCursorFromNextUrl(providerResponse._links.next);
        }

        return {
            results,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
