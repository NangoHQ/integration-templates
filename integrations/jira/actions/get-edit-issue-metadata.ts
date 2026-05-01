import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueIdOrKey: z.string().describe('The ID or key of the issue. Example: "10000" or "PROJ-123"')
});

const MetadataSchema = z.object({
    cloudId: z.string().optional(),
    baseUrl: z.string().optional()
});

const OutputSchema = z.object({
    fields: z.any()
});

// Response schema for validation
const JiraEditMetaResponseSchema = z.object({
    fields: z.any()
});

const action = createAction({
    description: 'Retrieve editable field metadata for an existing Jira issue',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-edit-issue-metadata',
        group: 'Issues'
    },
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Try to get cached cloudId/baseUrl from metadata first
        let cloudId: string | undefined;
        let baseUrl: string | undefined;

        // @allowTryCatch - getMetadata may not be available in some test scenarios
        try {
            const metadata = await nango.getMetadata<{ cloudId?: string; baseUrl?: string }>();
            cloudId = metadata?.cloudId;
            baseUrl = metadata?.baseUrl;
        } catch {
            // Metadata not available, will fetch from accessible-resources
        }

        // If not cached, fetch from accessible-resources endpoint
        if (!cloudId || !baseUrl) {
            // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#3--forge-apps-using-oauth-2--get-accessible-resources
            const resourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            const resources = resourcesResponse.data;
            if (!Array.isArray(resources) || resources.length === 0) {
                throw new nango.ActionError({
                    type: 'configuration_error',
                    message: 'Unable to resolve Jira cloudId. No accessible resources found.'
                });
            }

            cloudId = String(resources[0].id);
            baseUrl = String(resources[0].url);

            // Cache for future runs
            // @allowTryCatch - updateMetadata may not be available in some test scenarios
            try {
                await nango.updateMetadata({
                    cloudId,
                    baseUrl
                });
            } catch {
                // Failed to cache, continue anyway
            }
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-editmeta-get
        const response = await nango.get({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/editmeta`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 3
        });

        const responseData = JiraEditMetaResponseSchema.safeParse(response.data);
        if (!responseData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Jira API: response does not match expected schema'
            });
        }

        return {
            fields: responseData.data.fields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
