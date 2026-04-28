import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_id: z.string().describe('Page ID. Example: "123456789"'),
    property_id: z.string().describe('Property ID. Example: "987654321"'),
    key: z.string().describe('Property key. Example: "my-property"'),
    value: z.unknown().describe('JSON value to store.'),
    version_number: z.number().describe('Next version number. Must be higher than the current version.'),
    version_message: z.string().optional().describe('Optional version message.')
});

const MetadataSchema = z.object({
    cloud_id: z.string().optional(),
    cloudId: z.string().optional()
});

const ProviderVersionSchema = z.object({
    createdAt: z.string().optional(),
    message: z.string().optional(),
    number: z.number(),
    minorEdit: z.boolean().optional(),
    authorId: z.string().optional()
});

const ProviderContentPropertySchema = z.object({
    id: z.string(),
    key: z.string(),
    version: ProviderVersionSchema
});

const OutputSchema = z.object({
    id: z.string(),
    key: z.string(),
    version: z.object({
        createdAt: z.string().optional(),
        message: z.string().optional(),
        number: z.number(),
        minorEdit: z.boolean().optional(),
        authorId: z.string().optional()
    })
});

const AccessibleResourceSchema = z.object({
    id: z.string(),
    url: z.string().optional(),
    name: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    avatarUrl: z.string().optional()
});

const action = createAction({
    description: 'Update a content property on a Confluence page.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-page-property',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['read:page:confluence', 'write:page:confluence'],

    exec: async (nango, input) => {
        const connection = await nango.getConnection();

        let cloudId: string | undefined;

        if (connection.connection_config && typeof connection.connection_config['cloudId'] === 'string') {
            cloudId = connection.connection_config['cloudId'];
        }

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            if (metadata && typeof metadata.cloudId === 'string') {
                cloudId = metadata.cloudId;
            }
            if (!cloudId && metadata && typeof metadata.cloud_id === 'string') {
                cloudId = metadata.cloud_id;
            }
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/#getting-access-to-an-instance
            const accessibleResourcesResponse = await nango.get({
                endpoint: '/oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resourcesData = z.array(AccessibleResourceSchema).parse(accessibleResourcesResponse.data);
            const firstResource = resourcesData[0];
            if (!firstResource) {
                throw new nango.ActionError({
                    type: 'cloud_id_not_found',
                    message: 'Could not resolve Confluence cloud ID from connection config or accessible resources.'
                });
            }

            cloudId = firstResource.id;

            await nango.updateMetadata({
                cloud_id: cloudId
            });
        }

        const requestBody = {
            key: input.key,
            value: input.value,
            version: {
                number: input.version_number,
                ...(input.version_message !== undefined && { message: input.version_message })
            }
        };

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-pages-page-id-properties-property-id-put
        const response = await nango.put({
            endpoint: `/wiki/api/v2/pages/${input.page_id}/properties/${input.property_id}`,
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            data: requestBody,
            retries: 10
        });

        const providerProperty = ProviderContentPropertySchema.parse(response.data);

        return {
            id: providerProperty.id,
            key: providerProperty.key,
            version: {
                ...(providerProperty.version.createdAt !== undefined && { createdAt: providerProperty.version.createdAt }),
                ...(providerProperty.version.message !== undefined && { message: providerProperty.version.message }),
                number: providerProperty.version.number,
                ...(providerProperty.version.minorEdit !== undefined && { minorEdit: providerProperty.version.minorEdit }),
                ...(providerProperty.version.authorId !== undefined && { authorId: providerProperty.version.authorId })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
