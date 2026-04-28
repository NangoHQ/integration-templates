import { createAction, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    id: z.string().describe('Page ID. Example: "123456"'),
    draft: z.boolean().optional().describe('Delete the draft if present.'),
    purge: z.boolean().optional().describe('Permanently delete the page without moving it to trash.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const ConnectionConfigSchema = z.object({
    cloudId: z.string().optional()
});

const AccessibleResourceSchema = z.object({
    id: z.string()
});

const AccessibleResourcesSchema = z.array(AccessibleResourceSchema);

const action = createAction({
    description: 'Delete a Confluence page by id.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-page',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['write:page:confluence', 'delete:page:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const configParse = ConnectionConfigSchema.safeParse(connection.connection_config);
        let cloudId = configParse.success ? configParse.data.cloudId : undefined;

        if (!cloudId) {
            const metadata = MetadataSchema.parse((await nango.getMetadata()) ?? {});
            cloudId = metadata.cloudId;
        }

        if (!cloudId) {
            const resourcesConfig: ProxyConfiguration = {
                // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            };
            const response = await nango.get(resourcesConfig);
            const resources = AccessibleResourcesSchema.parse(response.data);
            if (resources.length === 0) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Confluence resources found for this connection.'
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

        const queryParams: Record<string, string> = {};
        if (input.draft !== undefined) {
            queryParams['draft'] = String(input.draft);
        }
        if (input.purge !== undefined) {
            queryParams['purge'] = String(input.purge);
        }

        const deleteConfig: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/
            endpoint: `/wiki/api/v2/pages/${input.id}`,
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            params: queryParams,
            retries: 10
        };
        await nango.delete(deleteConfig);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
