import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const ConnectionConfigSchema = z
    .object({
        cloudId: z.string().optional()
    })
    .passthrough();

const InputSchema = z.object({
    id: z.string().describe('Page ID. Example: "123456"'),
    title: z.string().describe('Page title'),
    status: z.string().describe('Page status. Example: "current"'),
    body: z.string().describe('Page body in storage format'),
    versionMessage: z.string().optional().describe('Version message')
});

const ProviderVersionSchema = z.object({
    number: z.number()
});

const ProviderPageSchema = z.object({
    id: z.string(),
    status: z.string(),
    title: z.string(),
    spaceId: z.string().optional(),
    version: ProviderVersionSchema
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    title: z.string(),
    spaceId: z.string().optional(),
    versionNumber: z.number().optional()
});

const AccessibleResourceSchema = z.object({
    id: z.string()
});

const action = createAction({
    metadata: MetadataSchema,
    description: 'Update a Confluence page by id',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write:page:confluence', 'read:page:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = ConnectionConfigSchema.parse(connection.connection_config || {});
        let cloudId = connectionConfig.cloudId;

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            const parsedMetadata = MetadataSchema.safeParse(metadata);
            if (parsedMetadata.success && parsedMetadata.data.cloudId) {
                cloudId = parsedMetadata.data.cloudId;
            }
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#accessing-data-from-an-on-behalf-of-integration
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });
            const resources = z.array(AccessibleResourceSchema).parse(accessibleResourcesResponse.data);
            if (resources.length === 0) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Confluence resources found'
                });
            }
            if (resources.length > 1) {
                throw new nango.ActionError({
                    type: 'ambiguous_cloud_id',
                    message: 'Multiple Confluence sites found. Please set an explicit cloudId in the connection metadata.'
                });
            }
            cloudId = resources[0]!.id;
            await nango.updateMetadata({ cloudId });
        }

        const baseUrl = `https://api.atlassian.com/ex/confluence/${cloudId}`;

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-get
        const getResponse = await nango.get({
            endpoint: `/wiki/api/v2/pages/${input.id}`,
            baseUrlOverride: baseUrl,
            params: {
                'body-format': 'storage'
            },
            retries: 3
        });

        const currentPage = ProviderPageSchema.parse(getResponse.data);
        const nextVersionNumber = currentPage.version.number + 1;

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-id-put
        const updateResponse = await nango.put({
            endpoint: `/wiki/api/v2/pages/${input.id}`,
            baseUrlOverride: baseUrl,
            data: {
                id: input.id,
                status: input.status,
                title: input.title,
                body: {
                    representation: 'storage',
                    value: input.body
                },
                version: {
                    number: nextVersionNumber,
                    ...(input.versionMessage !== undefined && { message: input.versionMessage })
                }
            },
            retries: 1
        });

        const updatedPage = ProviderPageSchema.parse(updateResponse.data);

        return {
            id: updatedPage.id,
            status: updatedPage.status,
            title: updatedPage.title,
            ...(updatedPage.spaceId !== undefined && { spaceId: updatedPage.spaceId }),
            versionNumber: updatedPage.version.number
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
