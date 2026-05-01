import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    jql: z.string().describe('JQL query string to search for issues. Example: "project = PROJ AND status = Open"'),
    fields: z.array(z.string()).optional().describe('Array of fields to return for each issue. Defaults to a set of common fields.'),
    expand: z.array(z.string()).optional().describe('Array of fields to expand in the response. Example: ["changelog", "renderedFields"]'),
    startAt: z.number().int().optional().describe('Index of the first item to return. Used for offset pagination.'),
    maxResults: z.number().int().optional().describe('Maximum number of results to return per page. Default varies by server.')
});

const IssueSchema = z.object({
    id: z.string(),
    key: z.string(),
    self: z.string(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    issues: z.array(IssueSchema),
    total: z.number().int(),
    maxResults: z.number().int(),
    nextPageToken: z.string().optional()
});

type IssueOutput = z.infer<typeof IssueSchema>;

const action = createAction({
    description: 'Search Jira issues using JQL.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/search-issues',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        // Get cloudId from connection_config or fallback to metadata
        let cloudId: string | undefined = connection.connection_config?.['cloudId'];

        if (!cloudId) {
            const metadata = await nango.getMetadata<{ cloudId?: string }>();
            cloudId = metadata?.cloudId;
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'invalid_connection',
                message: 'cloudId is required in connection configuration. Please reconnect your Jira integration.'
            });
        }

        // Build the request payload
        const payload: Record<string, unknown> = {
            jql: input['jql']
        };

        if (input['fields'] !== undefined) {
            payload['fields'] = input['fields'];
        }

        if (input['expand'] !== undefined) {
            payload['expand'] = input['expand'];
        }

        if (input['startAt'] !== undefined) {
            payload['startAt'] = input['startAt'];
        }

        if (input['maxResults'] !== undefined) {
            payload['maxResults'] = input['maxResults'];
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-jql-post
        const response = await nango.post({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/search/jql`,
            data: payload,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 3
        });

        const responseData = response.data;

        if (!responseData || typeof responseData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Jira API'
            });
        }

        const issues = Array.isArray(responseData['issues']) ? responseData['issues'] : [];

        // Parse and validate each issue
        const validatedIssues: IssueOutput[] = [];
        for (const issue of issues) {
            if (typeof issue !== 'object' || issue === null) {
                continue;
            }
            // Check if the issue has the required properties
            if (!('id' in issue) || !('key' in issue) || !('self' in issue)) {
                continue;
            }
            const id = issue['id'];
            const key = issue['key'];
            const self = issue['self'];
            const validatedIssue: IssueOutput = {
                id: String(id),
                key: String(key),
                self: String(self)
            };
            const fields = issue['fields'];
            if (fields !== undefined && typeof fields === 'object' && fields !== null) {
                const fieldsRecord: Record<string, unknown> = {};
                for (const [fieldKey, fieldValue] of Object.entries(fields)) {
                    fieldsRecord[fieldKey] = fieldValue;
                }
                validatedIssue['fields'] = fieldsRecord;
            }
            validatedIssues.push(validatedIssue);
        }

        const total = typeof responseData['total'] === 'number' ? responseData['total'] : issues.length;
        const maxResults = typeof responseData['maxResults'] === 'number' ? responseData['maxResults'] : issues.length;

        return {
            issues: validatedIssues,
            total,
            maxResults,
            ...(responseData['nextPageToken'] !== undefined &&
                responseData['nextPageToken'] !== null && {
                    nextPageToken: String(responseData['nextPageToken'])
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
