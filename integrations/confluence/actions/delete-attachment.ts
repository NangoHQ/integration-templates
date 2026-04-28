import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Attachment ID. Example: "123456"'),
    purge: z.boolean().optional().describe('Permanently delete the attachment. Must be true to purge a trashed attachment.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const action = createAction({
    description: 'Delete a Confluence attachment by id.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-attachment',
        group: 'Attachments'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['delete:attachment:confluence'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let cloudId: string | undefined;

        const connection = await nango.getConnection();
        if (connection && typeof connection === 'object') {
            const connectionConfig = connection['connection_config'];
            if (connectionConfig && typeof connectionConfig === 'object' && typeof connectionConfig['cloudId'] === 'string') {
                cloudId = connectionConfig['cloudId'];
            }
        }

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            if (metadata && typeof metadata === 'object' && typeof metadata['cloudId'] === 'string') {
                cloudId = metadata['cloudId'];
            }
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/#how-3lo-works
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                baseUrlOverride: 'https://api.atlassian.com',
                retries: 3
            });

            const resources = Array.isArray(accessibleResourcesResponse.data) ? accessibleResourcesResponse.data : [];
            if (resources.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_cloud_id',
                    message: 'Could not resolve Confluence cloudId from connection config or accessible resources.'
                });
            }
            if (resources.length > 1) {
                throw new nango.ActionError({
                    type: 'ambiguous_cloud_id',
                    message: 'Multiple Confluence sites found. Please set an explicit cloudId in the connection metadata.'
                });
            }
            const firstRes = resources[0];
            if (!firstRes || typeof firstRes !== 'object' || typeof firstRes['id'] !== 'string') {
                throw new nango.ActionError({
                    type: 'missing_cloud_id',
                    message: 'Could not resolve Confluence cloudId from connection config or accessible resources.'
                });
            }
            cloudId = firstRes['id'];

            await nango.updateMetadata({
                cloudId: cloudId
            });
        }

        const deleteParams: Record<string, string> = {};
        if (input.purge !== undefined) {
            deleteParams['purge'] = String(input.purge);
        }

        // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-attachment/#api-attachments-id-delete
        await nango.delete({
            endpoint: `/wiki/api/v2/attachments/${encodeURIComponent(input.id)}`,
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            ...(Object.keys(deleteParams).length > 0 && { params: deleteParams }),
            retries: 1
        });

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
