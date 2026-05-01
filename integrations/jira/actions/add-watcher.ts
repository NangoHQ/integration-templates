import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueIdOrKey: z.string().describe('The ID or key of the issue to add the watcher to. Example: "PROJ-123" or "10001"'),
    accountId: z.string().describe('The account ID of the user to add as a watcher. Example: "5b10ac8d82e05b22cc7d4ef5"')
});

const MetadataSchema = z.object({
    cloudId: z.string().optional().describe('Jira cloud ID'),
    baseUrl: z.string().optional().describe('Jira base URL')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Add a watcher to a Jira issue',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-watcher',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let cloudId: string | undefined = connection.connection_config?.['cloudId'];
        let baseUrl: string | undefined = connection.connection_config?.['baseUrl'];

        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata();
            cloudId = cloudId || metadata?.cloudId;
            baseUrl = baseUrl || metadata?.baseUrl;
        }

        if (!cloudId || !baseUrl) {
            // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#3--access-the-resource-using-the-access-token
            const response = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                const AccessibleResourceSchema = z.object({
                    id: z.string(),
                    url: z.string()
                });

                const firstResource = AccessibleResourceSchema.parse(response.data[0]);
                cloudId = firstResource.id;
                baseUrl = firstResource.url;

                await nango.updateMetadata({
                    cloudId,
                    baseUrl
                });
            }
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'Could not resolve Jira cloudId from connection config, metadata, or accessible resources'
            });
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-watchers/#api-rest-api-3-issue-issueidorkey-watchers-post
        // Send accountId as query parameter to avoid JSON serialization issues
        await nango.proxy({
            method: 'POST',
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/watchers`,
            params: {
                accountId: input.accountId
            },
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 1
        });

        return {
            success: true,
            message: `Watcher added to issue ${input.issueIdOrKey}`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
