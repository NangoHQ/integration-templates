import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fields: z.record(z.string(), z.unknown()),
    update: z.record(z.string(), z.unknown()).optional(),
    historyMetadata: z.record(z.string(), z.unknown()).optional(),
    properties: z.array(z.record(z.string(), z.unknown())).optional(),
    transition: z.record(z.string(), z.unknown()).optional()
});

const ProviderCreatedIssueSchema = z.object({
    id: z.string(),
    key: z.string(),
    self: z.string(),
    transition: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    key: z.string(),
    self: z.string(),
    url: z.string(),
    transition: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Create a Jira issue in a project.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-issue',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write:jira-work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let cloudId = connection.connection_config?.['cloudId'];
        let baseUrl = connection.connection_config?.['baseUrl'];

        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata();
            cloudId = cloudId || metadata?.['cloudId'];
            baseUrl = baseUrl || metadata?.['baseUrl'];
        }

        if (!cloudId || !baseUrl) {
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-oauth-2-3lo-apps/#api-rest-oauth-token-accessible-resources-get
            const response = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            const resources = z.array(z.record(z.string(), z.unknown())).parse(response.data);
            if (resources.length === 0) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Jira resources found for this connection.'
                });
            }

            const firstResource = resources[0];
            if (!firstResource) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Jira resources found for this connection.'
                });
            }

            const cloudIdValue = firstResource['id'];
            const baseUrlValue = firstResource['url'];

            if (typeof cloudIdValue !== 'string' || typeof baseUrlValue !== 'string') {
                throw new nango.ActionError({
                    type: 'invalid_resource',
                    message: 'Invalid resource format from accessible resources endpoint.'
                });
            }

            cloudId = cloudIdValue;
            baseUrl = baseUrlValue;
        }

        if (!cloudId || !baseUrl) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'Unable to resolve cloudId and baseUrl for Jira instance.'
            });
        }

        const requestBody: Record<string, unknown> = {
            fields: input.fields
        };

        if (input['update'] !== undefined) {
            requestBody['update'] = input['update'];
        }

        if (input['historyMetadata'] !== undefined) {
            requestBody['historyMetadata'] = input['historyMetadata'];
        }

        if (input['properties'] !== undefined) {
            requestBody['properties'] = input['properties'];
        }

        if (input['transition'] !== undefined) {
            requestBody['transition'] = input['transition'];
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post
        const response = await nango.post({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue`,
            data: requestBody,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 10
        });

        const createdIssue = ProviderCreatedIssueSchema.parse(response.data);

        const url = `${baseUrl}/browse/${createdIssue.key}`;

        return {
            id: createdIssue.id,
            key: createdIssue.key,
            self: createdIssue.self,
            url: url,
            ...(createdIssue.transition !== undefined && { transition: createdIssue.transition })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
