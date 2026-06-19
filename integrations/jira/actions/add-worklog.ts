import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issue_id_or_key: z.string().describe('The ID or key of the issue. Example: "10002" or "PROJ-123"'),
    time_spent_seconds: z.number().describe('The time spent working on the issue in seconds. Example: 12000 (for 3h 20m)'),
    started: z.string().optional().describe('The date/time when the work was started. Format: ISO 8601. Example: "2021-01-17T12:34:00.000+0000"'),
    comment: z.string().optional().describe('A comment about the work done. This is a plain text that will be converted to Atlassian Document Format.')
});

const VisibilitySchema = z.object({
    type: z.enum(['group', 'role']),
    value: z.string(),
    identifier: z.string().optional()
});

const UserSchema = z
    .object({
        accountId: z.string().optional(),
        displayName: z.string().optional(),
        emailAddress: z.string().optional(),
        active: z.boolean().optional()
    })
    .passthrough();

const ProviderWorklogSchema = z.object({
    id: z.string(),
    issueId: z.string(),
    self: z.string(),
    author: UserSchema.nullable().optional(),
    updateAuthor: UserSchema.nullable().optional(),
    comment: z.unknown().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    started: z.string().nullable().optional(),
    timeSpent: z.string().nullable().optional(),
    timeSpentSeconds: z.number().nullable().optional(),
    visibility: VisibilitySchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    issue_id: z.string(),
    time_spent_seconds: z.number().optional(),
    started: z.string().optional(),
    time_spent: z.string().optional(),
    author: UserSchema.optional(),
    comment: z.unknown().optional(),
    visibility: VisibilitySchema.optional()
});

const action = createAction({
    description: 'Log time against a Jira issue.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write:jira-work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Retrieve connection configuration for cloudId and baseUrl
        const connection = await nango.getConnection();
        let cloudId = connection.connection_config?.['cloudId'];

        // Fallback to metadata if connection config is not available
        if (!cloudId) {
            const metadata = await nango.getMetadata<{ cloudId?: string; baseUrl?: string }>();
            cloudId = metadata?.cloudId;
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'invalid_connection',
                message: 'Missing cloudId in connection configuration. Please reconnect your Jira account.'
            });
        }

        // Build request body
        const requestBody: Record<string, unknown> = {
            timeSpentSeconds: input.time_spent_seconds
        };

        if (input.started !== undefined) {
            requestBody['started'] = input.started;
        }

        if (input.comment !== undefined) {
            // Convert plain text comment to Atlassian Document Format
            requestBody['comment'] = {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: input.comment
                            }
                        ]
                    }
                ]
            };
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-worklogs/#api-rest-api-3-issue-issueidorkey-worklog-post
        const response = await nango.post({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issue_id_or_key}/worklog`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            data: requestBody,
            retries: 10
        });

        const providerWorklog = ProviderWorklogSchema.parse(response.data);

        return {
            id: providerWorklog.id,
            issue_id: providerWorklog.issueId,
            ...(providerWorklog.timeSpentSeconds != null && { time_spent_seconds: providerWorklog.timeSpentSeconds }),
            ...(providerWorklog.started != null && { started: providerWorklog.started }),
            ...(providerWorklog.timeSpent != null && { time_spent: providerWorklog.timeSpent }),
            ...(providerWorklog.author != null && {
                author: {
                    ...(providerWorklog.author.accountId != null && { account_id: providerWorklog.author.accountId }),
                    ...(providerWorklog.author.displayName != null && { display_name: providerWorklog.author.displayName }),
                    ...(providerWorklog.author.emailAddress != null && { email_address: providerWorklog.author.emailAddress }),
                    ...(providerWorklog.author.active != null && { active: providerWorklog.author.active })
                }
            }),
            ...(providerWorklog.comment != null && { comment: providerWorklog.comment }),
            ...(providerWorklog.visibility != null && { visibility: providerWorklog.visibility })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
