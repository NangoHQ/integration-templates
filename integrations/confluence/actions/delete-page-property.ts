import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageId: z.number().describe('Page ID. Example: 123'),
    propertyId: z.number().describe('Property ID. Example: 456')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const AccessibleResourceSchema = z.array(
    z.object({
        id: z.string()
    })
);

const action = createAction({
    description: 'Delete a content property from a Confluence page.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-page-property',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['read:page:confluence', 'write:page:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let cloudId = z.string().optional().parse(connection.connection_config?.['cloudId']);

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/rest/v2/intro/#auth
            const accessibleResources = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resources = AccessibleResourceSchema.parse(accessibleResources.data);
            const firstResource = resources[0];
            if (!firstResource) {
                throw new nango.ActionError({
                    type: 'missing_cloud_id',
                    message: 'No accessible Confluence resources found for this connection.'
                });
            }

            cloudId = firstResource.id;
            await nango.updateMetadata({ cloudId });
        }

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-content-properties/#api-pages-page-id-properties-property-id-delete
        const response = await nango.delete({
            endpoint: `wiki/api/v2/pages/${input.pageId}/properties/${input.propertyId}`,
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            retries: 1
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Page property ${input.propertyId} not found on page ${input.pageId}.`
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
