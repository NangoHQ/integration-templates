import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the attachment to delete. Example: "10001"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional(),
    baseUrl: z.string().optional()
});

const action = createAction({
    description: 'Delete an attachment from a Jira issue',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-attachment',
        group: 'Attachments'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['write:jira-work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Get cloudId from connection config or metadata
        const connection = await nango.getConnection();
        let cloudId = connection.connection_config?.['cloudId'];
        let baseUrl = connection.connection_config?.['baseUrl'];

        // If not in connection config, check metadata
        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata();
            cloudId = cloudId || metadata?.cloudId;
            baseUrl = baseUrl || metadata?.baseUrl;
        }

        // If still missing, fetch from accessible resources and cache
        if (!cloudId || !baseUrl) {
            // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#3--access-to-the-cloud-data
            const accessibleResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            const accessibleData = accessibleResponse.data;
            if (Array.isArray(accessibleData) && accessibleData.length > 0) {
                const firstResource = accessibleData[0];
                if (!cloudId) cloudId = firstResource.id;
                if (!baseUrl) baseUrl = firstResource.url;

                // Cache the values in metadata for subsequent runs
                if (cloudId && baseUrl) {
                    await nango.updateMetadata({
                        cloudId: cloudId,
                        baseUrl: baseUrl
                    });
                }
            }
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'Unable to determine Jira Cloud ID'
            });
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/#api-rest-api-3-attachment-id-delete
        await nango.delete({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/attachment/${input.id}`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 3
        });

        return {
            success: true,
            id: input.id
        };
    }
});

export default action;
