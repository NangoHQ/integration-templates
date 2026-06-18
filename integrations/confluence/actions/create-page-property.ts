import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_id: z.string().describe('The ID of the Confluence page. Example: "123456789"'),
    key: z.string().describe('The key of the content property. Example: "my-property"'),
    value: z.unknown().describe('The JSON value to store.')
});

const ProviderVersionSchema = z.object({
    createdAt: z.string().optional(),
    message: z.string().optional(),
    number: z.number().optional(),
    minorEdit: z.boolean().optional(),
    authorId: z.string().optional()
});

const ProviderPropertySchema = z.object({
    id: z.string().optional(),
    key: z.string(),
    value: z.unknown().optional(),
    version: ProviderVersionSchema.optional()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    key: z.string(),
    value: z.unknown().optional(),
    version: z
        .object({
            createdAt: z.string().optional(),
            message: z.string().optional(),
            number: z.number().optional(),
            minorEdit: z.boolean().optional(),
            authorId: z.string().optional()
        })
        .optional()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const action = createAction({
    description: 'Create a content property on a Confluence page.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['read:page:confluence', 'write:page:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let cloudId: string | undefined;

        if (connection.connection_config && typeof connection.connection_config === 'object') {
            const candidate = connection.connection_config['cloudId'];
            if (typeof candidate === 'string') {
                cloudId = candidate;
            }
        }

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            if (metadata && typeof metadata === 'object') {
                const candidate = metadata['cloudId'];
                if (typeof candidate === 'string') {
                    cloudId = candidate;
                }
            }
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const accessibleResourcesSchema = z.array(
                z.object({
                    id: z.string()
                })
            );

            const accessibleResources = accessibleResourcesSchema.parse(accessibleResourcesResponse.data);

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
            await nango.updateMetadata({ cloudId });
        }

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-pages-page-id-properties-post
        const response = await nango.post({
            endpoint: `/wiki/api/v2/pages/${input.page_id}/properties`,
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            data: {
                key: input.key,
                value: input.value
            },
            retries: 1
        });

        const providerProperty = ProviderPropertySchema.parse(response.data);

        return {
            ...(providerProperty.id != null && { id: providerProperty.id }),
            key: providerProperty.key,
            ...(providerProperty.value !== undefined && { value: providerProperty.value }),
            ...(providerProperty.version !== undefined && {
                version: {
                    ...(providerProperty.version.createdAt !== undefined && { createdAt: providerProperty.version.createdAt }),
                    ...(providerProperty.version.message !== undefined && { message: providerProperty.version.message }),
                    ...(providerProperty.version.number !== undefined && { number: providerProperty.version.number }),
                    ...(providerProperty.version.minorEdit !== undefined && { minorEdit: providerProperty.version.minorEdit }),
                    ...(providerProperty.version.authorId !== undefined && { authorId: providerProperty.version.authorId })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
