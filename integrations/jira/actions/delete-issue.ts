import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueIdOrKey: z.string().describe('The ID or key of the issue to delete. Example: "10001" or "PROJ-123"'),
    deleteSubtasks: z.boolean().optional().describe('If true, subtasks are also deleted. Defaults to false.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    issueIdOrKey: z.string()
});

const CloudIdResponseSchema = z.object({
    id: z.string(),
    url: z.string()
});

const AccessibleResourcesSchema = z.array(CloudIdResponseSchema);

const MetadataCacheSchema = z.object({
    cloudId: z.string(),
    baseUrl: z.string()
});

const action = createAction({
    description: 'Delete a Jira issue by ID or key',
    version: '1.0.0',
    endpoint: {
        method: 'DELETE',
        path: '/actions/delete-issue',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataCacheSchema,
    scopes: ['delete:issue'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Get connection to resolve cloudId
        const connection = await nango.getConnection();

        // Resolve cloudId from connection config
        let cloudId: string | undefined;
        let baseUrl: string | undefined;

        if (connection.connection_config) {
            const connectionConfigSchema = z.object({
                cloudId: z.string().optional(),
                baseUrl: z.string().optional()
            });
            const parsed = connectionConfigSchema.safeParse(connection.connection_config);
            if (parsed.success) {
                cloudId = parsed.data.cloudId;
                baseUrl = parsed.data.baseUrl;
            }
        }

        // If not in connection config, check metadata
        if (!cloudId || !baseUrl) {
            const metadataSchema = z.object({
                cloudId: z.string().optional(),
                baseUrl: z.string().optional()
            });
            // @allowTryCatch - metadata may not be set
            try {
                const metadataResult = metadataSchema.safeParse(await nango.getMetadata());
                if (metadataResult.success) {
                    cloudId = cloudId || metadataResult.data.cloudId;
                    baseUrl = baseUrl || metadataResult.data.baseUrl;
                }
            } catch {
                // Metadata not available, continue to accessible-resources
            }
        }

        // If still missing, fetch from accessible resources endpoint
        if (!cloudId || !baseUrl) {
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-oauth-2-0-app/#api-oauth-token-accessible-resources-get
            const response = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            const accessibleResources = AccessibleResourcesSchema.parse(response.data);

            if (!accessibleResources || accessibleResources.length === 0) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No Jira Cloud instances accessible with this connection'
                });
            }

            const firstResource = accessibleResources[0];
            if (firstResource) {
                if (!cloudId) cloudId = firstResource.id;
                if (!baseUrl) baseUrl = firstResource.url;
            }

            // Cache for subsequent runs
            if (cloudId && baseUrl) {
                const metadataToCache = MetadataCacheSchema.parse({ cloudId, baseUrl });
                await nango.updateMetadata(metadataToCache);
            }
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'Could not resolve Jira Cloud ID from connection config, metadata, or accessible resources'
            });
        }

        // Build query params for deleteSubtasks
        const params: Record<string, string> = {};
        if (input.deleteSubtasks !== undefined) {
            params['deleteSubtasks'] = String(input.deleteSubtasks);
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-delete
        await nango.delete({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}`,
            params: params,
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
