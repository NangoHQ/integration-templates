import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const InputSchema = z.object({
    id: z.number().describe('Space ID. Example: 196613'),
    includeIcon: z.boolean().optional().describe('Include the space icon in the response'),
    includeLabels: z.boolean().optional().describe('Include space labels in the response'),
    includeProperties: z.boolean().optional().describe('Include space properties in the response'),
    includePermissions: z.boolean().optional().describe('Include space permissions in the response'),
    includeOperations: z.boolean().optional().describe('Include space operations in the response')
});

const DescriptionSchema = z
    .object({
        plain: z.unknown().optional(),
        view: z.unknown().optional()
    })
    .optional();

const IconSchema = z
    .object({
        path: z.string().optional(),
        apiDownloadLink: z.string().optional()
    })
    .optional();

const LabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    prefix: z.string().optional()
});

const CursorMetaSchema = z
    .object({
        hasMore: z.boolean().optional(),
        cursor: z.string().optional()
    })
    .optional();

const SelfLinkSchema = z
    .object({
        self: z.string().optional()
    })
    .optional();

const LabelsResultSchema = z
    .object({
        results: z.array(LabelSchema).optional(),
        meta: CursorMetaSchema,
        _links: SelfLinkSchema
    })
    .optional();

const PropertyVersionSchema = z.object({
    createdAt: z.string().optional(),
    createdBy: z.string().optional(),
    message: z.string().optional(),
    number: z.number().optional()
});

const PropertySchema = z.object({
    id: z.string(),
    key: z.string(),
    createdAt: z.string().optional(),
    createdBy: z.string().optional(),
    version: PropertyVersionSchema.optional()
});

const PropertiesResultSchema = z
    .object({
        results: z.array(PropertySchema).optional(),
        meta: CursorMetaSchema,
        _links: SelfLinkSchema
    })
    .optional();

const OperationSchema = z.object({
    operation: z.string(),
    targetType: z.string()
});

const OperationsResultSchema = z
    .object({
        results: z.array(OperationSchema).optional(),
        meta: CursorMetaSchema,
        _links: SelfLinkSchema
    })
    .optional();

const PermissionPrincipalSchema = z.object({
    type: z.string().optional(),
    id: z.string().optional()
});

const PermissionOperationSchema = z.object({
    key: z.string().optional(),
    targetType: z.string().optional()
});

const PermissionSchema = z.object({
    id: z.string(),
    principal: PermissionPrincipalSchema.optional(),
    operation: PermissionOperationSchema.optional()
});

const PermissionsResultSchema = z
    .object({
        results: z.array(PermissionSchema).optional(),
        meta: CursorMetaSchema,
        _links: SelfLinkSchema
    })
    .optional();

const ProviderSpaceSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    type: z.string().optional(),
    status: z.string().optional(),
    authorId: z.string().optional(),
    createdAt: z.string().optional(),
    homepageId: z.string().optional(),
    description: DescriptionSchema,
    icon: IconSchema,
    labels: LabelsResultSchema,
    properties: PropertiesResultSchema,
    operations: OperationsResultSchema,
    permissions: PermissionsResultSchema,
    _links: z
        .object({
            base: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    type: z.string().optional(),
    status: z.string().optional(),
    authorId: z.string().optional(),
    createdAt: z.string().optional(),
    homepageId: z.string().optional(),
    description: DescriptionSchema,
    icon: IconSchema,
    labels: LabelsResultSchema,
    properties: PropertiesResultSchema,
    operations: OperationsResultSchema,
    permissions: PermissionsResultSchema,
    _links: z
        .object({
            base: z.string().optional()
        })
        .optional()
});

const AccessibleResourceSchema = z.object({
    id: z.string(),
    url: z.string().optional(),
    name: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a Confluence space by id.',
    version: '1.0.0',
    metadata: MetadataSchema,
    endpoint: {
        method: 'GET',
        path: '/actions/get-space',
        group: 'Spaces'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:space:confluence'],

    exec: async (nango, input) => {
        const connection = await nango.getConnection();
        let cloudId: string | undefined = undefined;

        if (connection.connection_config && typeof connection.connection_config === 'object' && 'cloudId' in connection.connection_config) {
            const parsed = z.string().safeParse(connection.connection_config['cloudId']);
            if (parsed.success) {
                cloudId = parsed.data;
            }
        }

        if (!cloudId) {
            const rawMetadata = await nango.getMetadata();
            const metadataParsed = MetadataSchema.safeParse(rawMetadata);
            if (metadataParsed.success && metadataParsed.data.cloudId) {
                cloudId = metadataParsed.data.cloudId;
            }
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/#accessible-resources
            const resourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resources = z.array(AccessibleResourceSchema).parse(resourcesResponse.data);
            cloudId = resources[0]?.id;

            if (!cloudId) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No accessible Confluence cloud resources found for this connection.'
                });
            }

            await nango.updateMetadata({ cloudId });
        }

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/
        const response = await nango.get({
            endpoint: `/wiki/api/v2/spaces/${input.id}`,
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            params: {
                ...(input.includeIcon !== undefined && { 'include-icon': String(input.includeIcon) }),
                ...(input.includeLabels !== undefined && { 'include-labels': String(input.includeLabels) }),
                ...(input.includeProperties !== undefined && { 'include-properties': String(input.includeProperties) }),
                ...(input.includePermissions !== undefined && { 'include-permissions': String(input.includePermissions) }),
                ...(input.includeOperations !== undefined && { 'include-operations': String(input.includeOperations) })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Space with id ${input.id} not found.`
            });
        }

        const providerSpace = ProviderSpaceSchema.parse(response.data);

        return {
            id: providerSpace.id,
            key: providerSpace.key,
            name: providerSpace.name,
            ...(providerSpace.type !== undefined && { type: providerSpace.type }),
            ...(providerSpace.status !== undefined && { status: providerSpace.status }),
            ...(providerSpace.authorId !== undefined && { authorId: providerSpace.authorId }),
            ...(providerSpace.createdAt !== undefined && { createdAt: providerSpace.createdAt }),
            ...(providerSpace.homepageId !== undefined && { homepageId: providerSpace.homepageId }),
            ...(providerSpace.description !== undefined && { description: providerSpace.description }),
            ...(providerSpace.icon !== undefined && { icon: providerSpace.icon }),
            ...(providerSpace.labels !== undefined && { labels: providerSpace.labels }),
            ...(providerSpace.properties !== undefined && { properties: providerSpace.properties }),
            ...(providerSpace.operations !== undefined && { operations: providerSpace.operations }),
            ...(providerSpace.permissions !== undefined && { permissions: providerSpace.permissions }),
            ...(providerSpace._links !== undefined && { _links: providerSpace._links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
