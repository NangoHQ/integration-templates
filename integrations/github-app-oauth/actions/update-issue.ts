import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner username or organization name.'),
        repo: z.string().describe('Repository name.'),
        issue_number: z.number().int().describe('Issue number to update.'),
        title: z.string().optional().describe('New title for the issue.'),
        body: z.string().optional().describe('New body content for the issue.'),
        state: z.enum(['open', 'closed']).optional().describe('State of the issue.'),
        state_reason: z.enum(['completed', 'not_planned', 'reopened', 'duplicate']).optional().describe('Reason for the state change.'),
        labels: z.array(z.string()).optional().describe('Array of label names to replace current labels.'),
        assignees: z.array(z.string()).optional().describe('Array of usernames to replace current assignees.'),
        milestone: z.number().int().nullable().optional().describe('Milestone number to associate with the issue, or null to remove it.')
    })
    .describe('Input to update an existing issue or pull request.');

const ProviderLabelSchema = z.object({
    name: z.string()
});

const ProviderAssigneeSchema = z.object({
    login: z.string()
});

const ProviderMilestoneSchema = z.object({
    number: z.number().int(),
    title: z.string()
});

const ProviderIssueSchema = z.object({
    id: z.number().int(),
    number: z.number().int(),
    title: z.string(),
    body: z.string().nullable(),
    state: z.string(),
    state_reason: z.string().nullable(),
    labels: z.array(ProviderLabelSchema),
    assignees: z.array(ProviderAssigneeSchema),
    milestone: ProviderMilestoneSchema.nullable(),
    html_url: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const LabelOutputSchema = z.object({
    name: z.string().describe('Label name.')
});

const AssigneeOutputSchema = z.object({
    login: z.string().describe('Username of the assignee.')
});

const MilestoneOutputSchema = z.object({
    number: z.number().int().describe('Milestone number.'),
    title: z.string().describe('Milestone title.')
});

const OutputSchema = z
    .object({
        id: z.number().int().describe('Unique issue identifier.'),
        number: z.number().int().describe('Issue number within the repository.'),
        title: z.string().describe('Issue title.'),
        body: z.string().nullable().optional().describe('Issue body content.'),
        state: z.string().describe('Issue state, e.g. "open" or "closed".'),
        state_reason: z.string().nullable().optional().describe('Reason for the current state.'),
        labels: z.array(LabelOutputSchema).optional().describe('Labels attached to the issue.'),
        assignees: z.array(AssigneeOutputSchema).optional().describe('Users assigned to the issue.'),
        milestone: MilestoneOutputSchema.nullable().optional().describe('Milestone associated with the issue.'),
        html_url: z.string().describe('URL to view the issue in a browser.'),
        created_at: z.string().describe('ISO 8601 timestamp of issue creation.'),
        updated_at: z.string().describe('ISO 8601 timestamp of the last update.')
    })
    .describe('Updated issue or pull request returned by the provider.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing issue by mutating its title, body, state, labels, assignees, or milestone.
 * @pitfalls: Labels and assignees are fully replaced when provided; omit the field to preserve existing values.
 */
const action = createAction({
    description: "Edit an issue's title, body, state, assignees, labels, or milestone.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28#update-an-issue
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/${input.issue_number}`,
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.body !== undefined && { body: input.body }),
                ...(input.state !== undefined && { state: input.state }),
                ...(input.state_reason !== undefined && { state_reason: input.state_reason }),
                ...(input.labels !== undefined && { labels: input.labels }),
                ...(input.assignees !== undefined && { assignees: input.assignees }),
                ...(input.milestone !== undefined && { milestone: input.milestone })
            },
            retries: 1
        };

        const response = await nango.patch(config);

        const providerIssue = ProviderIssueSchema.parse(response.data);

        return {
            id: providerIssue.id,
            number: providerIssue.number,
            title: providerIssue.title,
            ...(providerIssue.body != null && { body: providerIssue.body }),
            state: providerIssue.state,
            ...(providerIssue.state_reason != null && { state_reason: providerIssue.state_reason }),
            ...(providerIssue.labels.length > 0 && { labels: providerIssue.labels.map((label) => ({ name: label.name })) }),
            ...(providerIssue.assignees.length > 0 && { assignees: providerIssue.assignees.map((assignee) => ({ login: assignee.login })) }),
            ...(providerIssue.milestone != null && {
                milestone: {
                    number: providerIssue.milestone.number,
                    title: providerIssue.milestone.title
                }
            }),
            html_url: providerIssue.html_url,
            created_at: providerIssue.created_at,
            updated_at: providerIssue.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
