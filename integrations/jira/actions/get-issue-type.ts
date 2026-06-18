import * as z from 'zod';
import { createAction } from 'nango';

/**
 * Input schema for Get Issue Type action.
 */
const GetIssueTypeInputSchema = z.object({
    id: z.string().describe('The ID of the issue type to retrieve.')
});

/**
 * Project schema within scope.
 * Uses passthrough since the API may return partial project data with varying fields.
 */
const ProjectSchema = z
    .object({
        id: z.string(),
        key: z.string().optional(),
        name: z.string().optional(),
        self: z.string().optional(),
        projectTypeKey: z.string().optional(),
        simplified: z.boolean().optional(),
        avatarUrls: z.record(z.string(), z.string()).optional(),
        projectCategory: z
            .object({
                self: z.string(),
                id: z.string(),
                name: z.string(),
                description: z.string().optional()
            })
            .optional()
    })
    .passthrough();

/**
 * Scope schema.
 */
const ScopeSchema = z.object({
    type: z.string(),
    project: ProjectSchema.optional()
});

/**
 * Raw schema for Jira issue type as returned by the API.
 * Matches the Jira Cloud REST API v3 response structure.
 * Uses passthrough to allow additional properties the API may return.
 */
const RawIssueTypeSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        self: z.string(),
        iconUrl: z.string().optional(),
        avatarId: z.number().optional(),
        subtask: z.boolean().optional(),
        hierarchyLevel: z.number().optional(),
        entityId: z.string().optional(),
        scope: ScopeSchema.optional()
    })
    .passthrough();

/**
 * Output schema for Get Issue Type action.
 */
const GetIssueTypeOutputSchema = RawIssueTypeSchema;

/**
 * Metadata schema for Jira connection caching.
 */
const JiraMetadataSchema = z.object({
    cloudId: z.string().optional(),
    baseUrl: z.string().optional()
});

/**
 * Get Issue Type
 * Retrieve Jira issue type metadata by issue type ID.
 *
 * Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-types/#api-rest-api-3-issuetype-id-get
 */
export default createAction({
    description: 'Retrieve Jira issue type metadata by issue type ID.',
    version: '0.0.1',
    input: GetIssueTypeInputSchema,
    output: GetIssueTypeOutputSchema,
    metadata: JiraMetadataSchema,
    scopes: ['read:jira-work'],
    exec: async (nango, input) => {
        // Get connection to access cloudId and baseUrl from connection_config
        const connection = await nango.getConnection();

        // Resolve cloudId and baseUrl from connection_config or metadata
        let cloudId: string | undefined = connection.connection_config?.['cloudId'];
        let baseUrl: string | undefined = connection.connection_config?.['baseUrl'];

        if (!cloudId || !baseUrl) {
            // Check metadata as fallback
            const metadata = await nango.getMetadata<Record<string, string>>();
            if (!cloudId && metadata && typeof metadata === 'object' && 'cloudId' in metadata) {
                cloudId = metadata['cloudId'];
            }
            if (!baseUrl && metadata && typeof metadata === 'object' && 'baseUrl' in metadata) {
                baseUrl = metadata['baseUrl'];
            }

            // If still missing, fetch from accessible-resources endpoint
            if (!cloudId || !baseUrl) {
                const accessibleResourcesResponse = await nango.get({
                    endpoint: 'oauth/token/accessible-resources',
                    retries: 3
                });

                if (accessibleResourcesResponse.data && Array.isArray(accessibleResourcesResponse.data) && accessibleResourcesResponse.data.length > 0) {
                    const firstResource = accessibleResourcesResponse.data[0];
                    if (
                        firstResource !== null &&
                        typeof firstResource === 'object' &&
                        'id' in firstResource &&
                        'url' in firstResource &&
                        typeof firstResource.id === 'string' &&
                        typeof firstResource.url === 'string'
                    ) {
                        cloudId = firstResource.id;
                        baseUrl = firstResource.url;

                        // Cache for future runs
                        await nango.updateMetadata({ cloudId, baseUrl });
                    }
                }
            }
        }

        if (!cloudId) {
            throw new nango.ActionError({
                message: 'Unable to resolve cloudId for Jira connection.',
                code: 'missing_cloud_id'
            });
        }

        // Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-types/#api-rest-api-3-issuetype-id-get
        const response = await nango.get({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issuetype/${input.id}`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 3
        });

        return response.data;
    }
});
