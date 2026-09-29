import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive. Example: "nango"'),
        title: z.string().describe('The title of the issue. Example: "Found a bug"'),
        body: z.string().optional().describe('The contents of the issue, in Markdown. Example: "Steps to reproduce the problem."'),
        labels: z.array(z.string()).optional().describe('Label names to associate with this issue. Example: ["bug", "triage"]'),
        assignees: z.array(z.string()).optional().describe('Logins for users to assign to this issue. Example: ["octocat"]')
    })
    .describe('Parameters required to create an issue in a GitHub repository.');

const GitHubIssueSchema = z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().nullable().optional(),
    state: z.string(),
    url: z.string(),
    html_url: z.string(),
    labels: z.array(z.object({ name: z.string() })).optional(),
    assignees: z.array(z.object({ login: z.string() })).optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the issue. Example: 1'),
        number: z.number().describe('The issue number, unique within the repository. Example: 1347'),
        title: z.string().describe('The title of the issue. Example: "Found a bug"'),
        body: z.string().optional().describe('The contents of the issue, in Markdown. Omitted when the issue has no body.'),
        state: z.string().describe('State of the issue: either open or closed. Example: "open"'),
        labels: z.array(z.string()).describe('Names of the labels associated with the issue. Example: ["bug"]'),
        assignees: z.array(z.string()).describe('Logins of the users assigned to the issue. Example: ["octocat"]'),
        url: z.string().describe('The API URL of the issue. Example: "https://api.github.com/repos/octocat/Hello-World/issues/1347"'),
        html_url: z.string().describe('The web URL of the issue. Example: "https://github.com/octocat/Hello-World/issues/1347"'),
        created_at: z.string().describe('ISO 8601 timestamp of when the issue was created. Example: "2011-04-22T13:33:48Z"'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the issue was last updated. Example: "2011-04-22T13:33:48Z"')
    })
    .describe('The newly created GitHub issue.');

/**
 * @tags: [write]
 * @tagReason: Creates a new issue in the provider, a mutation, and performs no reads or deletions.
 * @pitfalls: Fails with a 410 provider error when the Issues feature is disabled on the target repository, even with valid permissions. Labels and assignees are silently dropped unless the authenticated identity has push access to the repository.
 */
const action = createAction({
    description: 'Create a new issue in a GitHub repository.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.github.com/rest/issues/issues#create-an-issue
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues`,
            data: {
                title: input.title,
                ...(input.body !== undefined && { body: input.body }),
                ...(input.labels !== undefined && { labels: input.labels }),
                ...(input.assignees !== undefined && { assignees: input.assignees })
            },
            retries: 1
        };
        const response = await nango.post(config);

        const issue = GitHubIssueSchema.parse(response.data);

        return {
            id: issue.id,
            number: issue.number,
            title: issue.title,
            ...(issue.body != null && { body: issue.body }),
            state: issue.state,
            labels: (issue.labels ?? []).map((label) => label.name),
            assignees: (issue.assignees ?? []).map((assignee) => assignee.login),
            url: issue.url,
            html_url: issue.html_url,
            created_at: issue.created_at,
            updated_at: issue.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
