import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    label_id: z.string().describe('Label ID. Example: "22"'),
    space_ids: z.array(z.string()).optional().describe('Optional space IDs to filter pages'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(250).optional().describe('Maximum number of results per page. Default: 25')
});

const PageVersionSchema = z.object({
    createdAt: z.string().optional(),
    message: z.string().optional(),
    number: z.number().optional(),
    minorEdit: z.boolean().optional(),
    authorId: z.string().optional()
});

const PageBodySchema = z.object({
    storage: z.unknown().optional(),
    atlas_doc_format: z.unknown().optional()
});

const PageLinksSchema = z.object({
    webui: z.string().optional(),
    editui: z.string().optional(),
    tinyui: z.string().optional()
});

const PageSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    spaceId: z.string().optional(),
    parentId: z.string().optional(),
    parentType: z.string().optional(),
    position: z.number().optional(),
    authorId: z.string().optional(),
    ownerId: z.string().optional(),
    lastOwnerId: z.string().optional(),
    subtype: z.string().optional(),
    createdAt: z.string().optional(),
    version: PageVersionSchema.optional(),
    body: PageBodySchema.optional(),
    _links: PageLinksSchema.optional()
});

const ListResponseSchema = z.object({
    results: z.array(PageSchema),
    _links: z
        .object({
            next: z.string().optional(),
            base: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    pages: z.array(
        z.object({
            id: z.string(),
            status: z.string().optional(),
            title: z.string().optional(),
            spaceId: z.string().optional(),
            parentId: z.string().optional(),
            parentType: z.string().optional(),
            position: z.number().optional(),
            authorId: z.string().optional(),
            ownerId: z.string().optional(),
            lastOwnerId: z.string().optional(),
            subtype: z.string().optional(),
            createdAt: z.string().optional(),
            version: PageVersionSchema.optional(),
            body: PageBodySchema.optional(),
            _links: PageLinksSchema.optional()
        })
    ),
    next_cursor: z.string().optional()
});

const ConnectionConfigSchema = z.object({
    cloudId: z.string().optional()
});

const AccessibleResourceSchema = z.object({
    id: z.string()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const action = createAction({
    description: 'List Confluence pages attached to a label',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-pages-for-label',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['read:page:confluence', 'read:label:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const parsedConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
        let cloudId = parsedConfig.success ? parsedConfig.data.cloudId : undefined;

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            const MetadataSchema = z.object({
                cloudId: z.string().optional()
            });
            const parsedMetadata = MetadataSchema.safeParse(metadata);
            cloudId = parsedMetadata.success ? parsedMetadata.data.cloudId : undefined;
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/#access-resources
            const resourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resourcesArraySchema = z.array(AccessibleResourceSchema);
            const resources = resourcesArraySchema.safeParse(resourcesResponse.data);

            if (!resources.success || resources.data.length === 0) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Confluence resources found for this connection.'
                });
            }
            if (resources.data.length > 1) {
                throw new nango.ActionError({
                    type: 'ambiguous_cloud_id',
                    message: 'Multiple Confluence sites found. Please set an explicit cloudId in the connection metadata.'
                });
            }

            cloudId = resources.data[0]!.id;

            if (cloudId) {
                await nango.updateMetadata({
                    cloudId: cloudId
                });
            }
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'Unable to determine Confluence cloud ID.'
            });
        }

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-wiki-api-v2-labels-id-pages-get
        const response = await nango.get({
            endpoint: `/wiki/api/v2/labels/${input.label_id}/pages`,
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            params: {
                'body-format': 'storage',
                limit: input.limit ?? 25,
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.space_ids !== undefined && input.space_ids.length > 0 && { 'space-id': input.space_ids })
            },
            retries: 3
        });

        const parsed = ListResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The Confluence API returned an unexpected response format.',
                details: parsed.error.message
            });
        }

        let nextCursor: string | undefined;
        if (parsed.data._links?.next) {
            // @allowTryCatch: URL constructor may throw on malformed input from the provider.
            // We gracefully skip next_cursor extraction rather than fail the whole action.
            try {
                const nextUrl = new URL(parsed.data._links.next, 'https://api.atlassian.com');
                const cursorValue = nextUrl.searchParams.get('cursor');
                if (cursorValue) {
                    nextCursor = cursorValue;
                }
            } catch {
                // If URL parsing fails, fall back to returning the raw next link
                // or skip next_cursor
            }
        }

        return {
            pages: parsed.data.results.map((page) => ({
                id: page.id,
                ...(page.status !== undefined && { status: page.status }),
                ...(page.title !== undefined && { title: page.title }),
                ...(page.spaceId !== undefined && { spaceId: page.spaceId }),
                ...(page.parentId !== undefined && { parentId: page.parentId }),
                ...(page.parentType !== undefined && { parentType: page.parentType }),
                ...(page.position !== undefined && { position: page.position }),
                ...(page.authorId !== undefined && { authorId: page.authorId }),
                ...(page.ownerId !== undefined && { ownerId: page.ownerId }),
                ...(page.lastOwnerId !== undefined && { lastOwnerId: page.lastOwnerId }),
                ...(page.subtype !== undefined && { subtype: page.subtype }),
                ...(page.createdAt !== undefined && { createdAt: page.createdAt }),
                ...(page.version !== undefined && { version: page.version }),
                ...(page.body !== undefined && { body: page.body }),
                ...(page._links !== undefined && { _links: page._links })
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
