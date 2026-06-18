import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueIdOrKey: z.string().describe('The ID or key of the issue. Example: "10001" or "PROJ-123"'),
    accountId: z.string().describe('The accountId of the user to remove as a watcher. Example: "5b10ac8d82e05b22cc7d4ef5"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the watcher was successfully removed'),
    issueIdOrKey: z.string().describe('The issue ID or key that was modified')
});

const MetadataSchema = z.object({
    cloudId: z.string().optional().describe('Jira Cloud ID'),
    baseUrl: z.string().optional().describe('Jira Base URL')
});

const action = createAction({
    description: 'Remove a watcher from a Jira issue',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['read:jira', 'write:jira'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let cloudId = connection.connection_config?.['cloudId'];
        let baseUrl = connection.connection_config?.['baseUrl'];

        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
            cloudId = cloudId || metadata?.cloudId;
            baseUrl = baseUrl || metadata?.baseUrl;
        }

        if (!cloudId || !baseUrl) {
            const accessibleResourcesResponse = await nango.get({
                // https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/#oauth-2-0--3lo-
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            const accessibleResources = accessibleResourcesResponse.data;
            if (
                !Array.isArray(accessibleResources) ||
                accessibleResources.length === 0 ||
                typeof accessibleResources[0].id !== 'string' ||
                typeof accessibleResources[0].url !== 'string'
            ) {
                throw new nango.ActionError({
                    type: 'missing_cloud_id',
                    message: 'Could not resolve Jira cloudId. Please ensure the connection has valid configuration.'
                });
            }

            cloudId = accessibleResources[0].id;
            baseUrl = accessibleResources[0].url;

            if (typeof cloudId !== 'string' || typeof baseUrl !== 'string') {
                throw new nango.ActionError({
                    type: 'invalid_cloud_data',
                    message: 'Retrieved cloud data is invalid.'
                });
            }

            await nango.updateMetadata({
                cloudId: cloudId,
                baseUrl: baseUrl
            });
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-watchers/#api-rest-api-3-issue-issueidorkey-watchers-delete
        await nango.delete({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/watchers`,
            params: {
                accountId: input.accountId
            },
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 3
        });

        return {
            success: true,
            issueIdOrKey: input.issueIdOrKey
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
