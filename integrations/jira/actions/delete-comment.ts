import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueIdOrKey: z.string().describe('The ID or key of the issue. Example: "PROJ-123"'),
    commentId: z.string().describe('The ID of the comment to delete. Example: "10000"'),
    cloudId: z.string().optional().describe('Optional Jira cloud ID. If not provided, will be resolved from connection.'),
    baseUrl: z.string().optional().describe('Optional Jira base URL. If not provided, will be resolved from connection.')
});

const CloudIdSchema = z.object({
    id: z.string()
});

const AccessibleResourcesSchema = z.array(
    z.object({
        id: z.string(),
        url: z.string()
    })
);

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const ConnectionConfigSchema = z.object({
    cloudId: z.string().optional(),
    baseUrl: z.string().optional()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional(),
    baseUrl: z.string().optional()
});

const action = createAction({
    description: 'Delete a comment from a Jira issue',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['write:jira-work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Use provided cloudId or resolve from connection
        let cloudId = input.cloudId;

        if (!cloudId) {
            const connection = await nango.getConnection();

            // Resolve cloudId from connection_config
            const parsedConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
            cloudId = cloudId || (parsedConfig.success ? parsedConfig.data.cloudId : undefined);
        }

        if (!cloudId) {
            const metadata = await nango.getMetadata();
            const parsedMetadata = MetadataSchema.safeParse(metadata);
            cloudId = cloudId || (parsedMetadata.success ? parsedMetadata.data.cloudId : undefined);
        }

        if (!cloudId) {
            // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#access-to-data-using-access-tokens
            const accessibleResources = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            const parsed = AccessibleResourcesSchema.safeParse(accessibleResources.data);
            if (!parsed.success || parsed.data.length === 0) {
                throw new nango.ActionError({
                    type: 'configuration_error',
                    message: 'Unable to resolve cloudId. No Jira instances found for this connection.'
                });
            }

            const firstResource = parsed.data[0];
            if (firstResource === undefined) {
                throw new nango.ActionError({
                    type: 'configuration_error',
                    message: 'Unable to resolve cloudId. No Jira instances found for this connection.'
                });
            }

            cloudId = firstResource.id;
            await nango.updateMetadata({ cloudId });
        }

        const parsedCloudId = CloudIdSchema.safeParse({ id: cloudId });
        if (!parsedCloudId.success) {
            throw new nango.ActionError({
                type: 'configuration_error',
                message: 'Invalid or missing cloudId'
            });
        }

        const config: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-id-delete
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/comment/${input.commentId}`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 1
        };

        await nango.delete(config);

        return {
            success: true,
            message: 'Comment deleted successfully'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
