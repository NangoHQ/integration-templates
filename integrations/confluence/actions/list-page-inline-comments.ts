import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageId: z.string().describe('The ID of the Confluence page. Example: "123456"'),
    status: z.array(z.string()).optional().describe('Filter by comment status. Example: ["current"]'),
    resolutionStatus: z.array(z.string()).optional().describe('Filter by resolution status. Example: ["open"]'),
    sort: z.string().optional().describe('Sort order. Example: "created-date"'),
    bodyFormat: z.string().optional().describe('Body format representation. Defaults to "storage". Example: "storage"'),
    limit: z.number().optional().describe('Maximum number of results per page. Example: 25'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const AccessibleResourcesSchema = z.array(
    z
        .object({
            id: z.string()
        })
        .passthrough()
);

const VersionSchema = z.object({
    createdAt: z.string().optional(),
    message: z.string().optional(),
    number: z.number().optional(),
    minorEdit: z.boolean().optional(),
    authorId: z.string().optional()
});

const BodySchema = z.object({
    storage: z.record(z.string(), z.unknown()).optional(),
    atlas_doc_format: z.record(z.string(), z.unknown()).optional(),
    view: z.record(z.string(), z.unknown()).optional()
});

const PropertiesSchema = z.object({
    inlineMarkerRef: z.string().optional(),
    inlineOriginalSelection: z.string().optional()
});

const InlineCommentSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    pageId: z.string().optional(),
    version: VersionSchema.optional(),
    body: BodySchema.optional(),
    resolutionStatus: z.string().optional(),
    properties: PropertiesSchema.optional(),
    _links: z
        .object({
            webui: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    comments: z.array(InlineCommentSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List inline comments for a Confluence page.',
    version: '1.0.1',
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:comment:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const config = connection.connection_config;
        let cloudId: string | undefined;
        if (config !== null && typeof config === 'object' && !Array.isArray(config)) {
            const candidate = config['cloudId'];
            if (typeof candidate === 'string') {
                cloudId = candidate;
            }
        }

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            const metadataParsed = MetadataSchema.safeParse(metadata);
            if (metadataParsed.success && metadataParsed.data.cloudId) {
                cloudId = metadataParsed.data.cloudId;
            }
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/#access-token-authorized-resources
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const accessibleResources = AccessibleResourcesSchema.parse(accessibleResourcesResponse.data);
            if (accessibleResources.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
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
            await nango.updateMetadata({ cloudId: cloudId });
        }

        const params: Record<string, string | number | string[] | number[]> = {
            'body-format': input.bodyFormat ?? 'storage'
        };

        if (input.status !== undefined && input.status.length > 0) {
            params['status'] = input.status;
        }

        if (input.resolutionStatus !== undefined && input.resolutionStatus.length > 0) {
            params['resolution-status'] = input.resolutionStatus;
        }

        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-comment/#api-pages-id-inline-comments-get
        const response = await nango.get({
            endpoint: `/wiki/api/v2/pages/${input.pageId}/inline-comments`,
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            params,
            retries: 3
        });

        const ResponseSchema = z.object({
            results: z.array(
                z
                    .object({
                        id: z.string(),
                        status: z.string().optional(),
                        title: z.string().optional(),
                        pageId: z.string().optional(),
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
                                storage: z.record(z.string(), z.unknown()).optional(),
                                atlas_doc_format: z.record(z.string(), z.unknown()).optional(),
                                view: z.record(z.string(), z.unknown()).optional()
                            })
                            .optional(),
                        resolutionStatus: z.string().optional(),
                        properties: z
                            .object({
                                inlineMarkerRef: z.string().optional(),
                                inlineOriginalSelection: z.string().optional()
                            })
                            .optional(),
                        _links: z
                            .object({
                                webui: z.string().optional()
                            })
                            .optional()
                    })
                    .passthrough()
            ),
            _links: z
                .object({
                    next: z.string().optional(),
                    base: z.string().optional()
                })
                .optional()
        });

        const parsed = ResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        if (parsed._links?.next) {
            const match = parsed._links.next.match(/[?&]cursor=([^&]+)/);
            if (match && match[1]) {
                nextCursor = decodeURIComponent(match[1]);
            }
        }

        return {
            comments: parsed.results,
            ...(nextCursor !== undefined && { nextCursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
