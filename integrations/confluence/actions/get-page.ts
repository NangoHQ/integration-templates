import { z } from 'zod';
import { createAction } from 'nango';

function stripNulls(value: unknown): unknown {
    if (value === null) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value.map(stripNulls);
    }
    if (typeof value === 'object' && value !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            result[key] = stripNulls(val);
        }
        return result;
    }
    return value;
}

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const InputSchema = z.object({
    id: z.string().describe('Page ID. Example: "123456"'),
    bodyFormat: z.enum(['storage', 'atlas_doc_format', 'view']).optional().describe('Body representation format. Defaults to storage.'),
    includeLabels: z.boolean().optional().describe('Include labels in the response'),
    includeProperties: z.boolean().optional().describe('Include content properties in the response'),
    includeOperations: z.boolean().optional().describe('Include operations in the response'),
    includeLikes: z.boolean().optional().describe('Include likes in the response'),
    includeVersions: z.boolean().optional().describe('Include versions in the response')
});

const ConnectionConfigSchema = z.object({
    cloudId: z.string().optional()
});

const VersionSchema = z
    .object({
        createdAt: z.string().optional(),
        message: z.string().optional(),
        number: z.number().optional(),
        minorEdit: z.boolean().optional(),
        authorId: z.string().optional()
    })
    .optional();

const BodySchema = z
    .object({
        storage: z.record(z.string(), z.unknown()).optional(),
        atlas_doc_format: z.record(z.string(), z.unknown()).optional(),
        view: z.record(z.string(), z.unknown()).optional()
    })
    .optional();

const LinkSchema = z
    .object({
        self: z.string().optional(),
        base: z.string().optional(),
        webui: z.string().optional(),
        editui: z.string().optional(),
        tinyui: z.string().optional(),
        next: z.string().optional()
    })
    .optional();

const MetaSchema = z
    .object({
        hasMore: z.boolean().optional(),
        cursor: z.string().optional()
    })
    .optional();

const LabelResultSchema = z.object({
    id: z.string(),
    name: z.string(),
    prefix: z.string()
});

const LabelsSchema = z
    .object({
        results: z.array(LabelResultSchema).optional(),
        meta: MetaSchema,
        _links: LinkSchema
    })
    .optional();

const PropertyResultSchema = z.object({
    id: z.string(),
    key: z.string(),
    version: z.record(z.string(), z.unknown()).optional()
});

const PropertiesSchema = z
    .object({
        results: z.array(PropertyResultSchema).optional(),
        meta: MetaSchema,
        _links: LinkSchema
    })
    .optional();

const OperationResultSchema = z.object({
    operation: z.string(),
    targetType: z.string()
});

const OperationsSchema = z
    .object({
        results: z.array(OperationResultSchema).optional(),
        meta: MetaSchema,
        _links: LinkSchema
    })
    .optional();

const LikeResultSchema = z.object({
    accountId: z.string()
});

const LikesSchema = z
    .object({
        results: z.array(LikeResultSchema).optional(),
        meta: MetaSchema,
        _links: LinkSchema
    })
    .optional();

const VersionsSchema = z
    .object({
        results: z.array(VersionSchema).optional(),
        meta: MetaSchema,
        _links: LinkSchema
    })
    .optional();

const OutputSchema = z
    .object({
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
        createdAt: z.string().optional(),
        version: VersionSchema,
        body: BodySchema,
        labels: LabelsSchema,
        properties: PropertiesSchema,
        operations: OperationsSchema,
        likes: LikesSchema,
        versions: VersionsSchema,
        isFavoritedByCurrentUser: z.boolean().optional(),
        _links: LinkSchema
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a Confluence page by id.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-page',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['read:page:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-get
        const connection = await nango.getConnection();

        const connectionConfig = ConnectionConfigSchema.parse(connection.connection_config || {});
        let cloudId = connectionConfig.cloudId;

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            const parsedMetadata = MetadataSchema.parse(metadata || {});
            cloudId = parsedMetadata.cloudId;
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resources = z
                .array(
                    z.object({
                        id: z.string()
                    })
                )
                .parse(accessibleResourcesResponse.data);

            const firstResource = resources[0];
            if (!firstResource) {
                throw new nango.ActionError({
                    type: 'missing_cloud_id',
                    message: 'Unable to resolve Confluence cloud ID from accessible resources.'
                });
            }

            cloudId = firstResource.id;

            await nango.updateMetadata({
                cloudId
            });
        }

        const params: Record<string, string> = {
            'body-format': input.bodyFormat ?? 'storage'
        };

        if (input.includeLabels !== undefined) {
            params['include-labels'] = String(input.includeLabels);
        }

        if (input.includeProperties !== undefined) {
            params['include-properties'] = String(input.includeProperties);
        }

        if (input.includeOperations !== undefined) {
            params['include-operations'] = String(input.includeOperations);
        }

        if (input.includeLikes !== undefined) {
            params['include-likes'] = String(input.includeLikes);
        }

        if (input.includeVersions !== undefined) {
            params['include-versions'] = String(input.includeVersions);
        }

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-get
        const response = await nango.get({
            endpoint: `/wiki/api/v2/pages/${input.id}`,
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Page with id ${input.id} not found.`
            });
        }

        const page = OutputSchema.parse(stripNulls(response.data));

        return page;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
