import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageId: z.string().describe('Page ID. Example: "12345678"'),
    propertyId: z.string().describe('Property ID. Example: "123456"')
});

const PropertyVersionSchema = z.object({
    createdAt: z.string().optional(),
    message: z.string().optional(),
    number: z.number().optional(),
    minorEdit: z.boolean().optional(),
    authorId: z.string().optional()
});

const ProviderPropertySchema = z.object({
    id: z.string(),
    key: z.string(),
    value: z.unknown().optional(),
    version: PropertyVersionSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    key: z.string(),
    value: z.unknown().optional(),
    version: PropertyVersionSchema.optional()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a content property from a Confluence page.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['read:page:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        let cloudId: string | undefined;

        if (
            connectionConfig &&
            typeof connectionConfig === 'object' &&
            !Array.isArray(connectionConfig) &&
            'cloudId' in connectionConfig &&
            typeof connectionConfig['cloudId'] === 'string'
        ) {
            cloudId = connectionConfig['cloudId'];
        }

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            if (metadata && typeof metadata === 'object' && !Array.isArray(metadata) && 'cloudId' in metadata && typeof metadata['cloudId'] === 'string') {
                cloudId = metadata['cloudId'];
            }
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/#2-2-get-a-list-of-accessible-resources
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resources = accessibleResourcesResponse.data;
            if (!Array.isArray(resources) || resources.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No accessible Confluence resources found for this connection.'
                });
            }

            if (resources.length > 1) {
                throw new nango.ActionError({
                    type: 'ambiguous_cloud_id',
                    message: 'Multiple Confluence sites found. Please set an explicit cloudId in the connection metadata.'
                });
            }
            const firstResource = resources[0];
            if (!firstResource || typeof firstResource !== 'object' || !('id' in firstResource) || firstResource.id == null) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected response from accessible-resources endpoint.'
                });
            }

            cloudId = String(firstResource.id);
            await nango.updateMetadata({ cloudId });
        }

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-pages-page-id-properties-property-id-get
        const response = await nango.get({
            endpoint: `/wiki/api/v2/pages/${input.pageId}/properties/${input.propertyId}`,
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            retries: 3
        });

        const providerProperty = ProviderPropertySchema.parse(response.data);

        return {
            id: providerProperty.id,
            key: providerProperty.key,
            ...(providerProperty.value !== undefined && { value: providerProperty.value }),
            ...(providerProperty.version !== undefined && { version: providerProperty.version })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
