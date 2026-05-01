import * as z from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueIdOrKey: z.string().describe('The ID or key of the issue. Example: "PROJ-123"'),
    transitionId: z.string().describe('The ID of the transition to perform. Example: "31"'),
    fields: z.record(z.string(), z.unknown()).optional(),
    update: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    issueIdOrKey: z.string()
});

const action = createAction({
    description: 'Move a Jira issue through a workflow transition.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/transition-issue',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write:jira-work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Get cloudId and baseUrl from connection config or metadata
        const connection = await nango.getConnection();
        const metadata = await nango.getMetadata<{ cloudId?: string; baseUrl?: string }>();

        let cloudId = connection.connection_config?.['cloudId'];
        let baseUrl = connection.connection_config?.['baseUrl'];

        if (!cloudId) {
            cloudId = metadata?.cloudId;
        }
        if (!baseUrl) {
            baseUrl = metadata?.baseUrl;
        }

        // If still missing, fetch from accessible-resources endpoint
        if (!cloudId) {
            const accessibleResourcesResponse = await nango.get({
                // https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            const resources = accessibleResourcesResponse.data;
            if (!Array.isArray(resources) || resources.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_accessible_resources',
                    message: 'No accessible Jira resources found for this connection.'
                });
            }

            cloudId = resources[0].id;
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'Unable to determine Jira Cloud ID.'
            });
        }

        // Build the transition payload
        const transitionPayload: {
            transition: { id: string };
            fields?: Record<string, unknown>;
            update?: Record<string, unknown>;
        } = {
            transition: {
                id: input.transitionId
            }
        };

        if (input.fields !== undefined && typeof input.fields === 'object' && input.fields !== null) {
            transitionPayload.fields = input.fields;
        }

        if (input.update !== undefined && typeof input.update === 'object' && input.update !== null) {
            transitionPayload.update = input.update;
        }

        // Perform the transition
        await nango.post({
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-post
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/transitions`,
            data: transitionPayload,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 10
        });

        return {
            success: true,
            issueIdOrKey: input.issueIdOrKey
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
