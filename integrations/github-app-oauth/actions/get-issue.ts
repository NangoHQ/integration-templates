import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner login. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        issue_number: z.number().describe('Issue or pull request number. Example: 1')
    })
    .describe('Input for fetching a single issue or pull request by number.');

const UserSchema = z.object({
    login: z.string().describe('Username login.'),
    id: z.number().describe('User ID.'),
    avatar_url: z.string().describe('Avatar image URL.').optional(),
    html_url: z.string().describe('Profile page URL.').optional(),
    type: z.string().describe('Actor type, such as "User" or "Organization".').optional()
});

const LabelSchema = z.object({
    id: z.number().describe('Label ID.'),
    name: z.string().describe('Label name.'),
    color: z.string().describe('Hex color code.').optional(),
    description: z.string().describe('Label description.').optional()
});

const MilestoneSchema = z.object({
    id: z.number().describe('Milestone ID.'),
    number: z.number().describe('Milestone number within the repository.'),
    title: z.string().describe('Milestone title.'),
    state: z.string().describe('Milestone state, such as "open" or "closed".').optional()
});

const PullRequestRefSchema = z.object({
    url: z.string().describe('API URL for the pull request.').optional(),
    html_url: z.string().describe('Web URL for the pull request.').optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Global issue ID.'),
        node_id: z.string().describe('Global node ID.').optional(),
        number: z.number().describe('Issue number within the repository.'),
        title: z.string().describe('Issue title.'),
        state: z.string().describe('Issue state, such as "open" or "closed".'),
        locked: z.boolean().describe('Whether the issue is locked.').optional(),
        body: z.string().nullable().describe('Issue body in Markdown.').optional(),
        user: UserSchema.nullable().describe('User who created the issue.').optional(),
        labels: z.array(LabelSchema).describe('Labels attached to the issue.').optional(),
        assignees: z.array(UserSchema).describe('Users assigned to the issue.').optional(),
        milestone: MilestoneSchema.nullable().describe('Milestone this issue belongs to.').optional(),
        created_at: z.string().describe('ISO 8601 creation timestamp.').optional(),
        updated_at: z.string().describe('ISO 8601 last-update timestamp.').optional(),
        closed_at: z.string().nullable().describe('ISO 8601 close timestamp, or null if open.').optional(),
        closed_by: UserSchema.nullable().describe('User who closed the issue, or null if open.').optional(),
        author_association: z.string().describe('Author association to the repository.').optional(),
        comments: z.number().describe('Number of comments.').optional(),
        html_url: z.string().describe('Web URL for the issue.').optional(),
        url: z.string().describe('API URL for the issue.').optional(),
        pull_request: PullRequestRefSchema.nullable().describe('Present when the issue is also a pull request.').optional()
    })
    .describe('Output representing a single GitHub issue or pull request.');

/**
 * @tags: [read]
 * @tagReason: Fetches a single issue or pull request record by number from the GitHub API.
 * @pitfalls: GitHub uses a single numbering sequence for issues and pull requests, so querying a pull request number returns the pull request with a `pull_request` key present instead of a regular issue.
 */
const action = createAction({
    description: 'Fetch a single issue or pull request issue record by number.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/issues/issues#get-an-issue
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues/${input.issue_number}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Issue ${input.issue_number} not found in ${input.owner}/${input.repo}.`,
                owner: input.owner,
                repo: input.repo,
                issue_number: input.issue_number
            });
        }

        const providerIssue = z
            .object({
                id: z.number(),
                node_id: z.string().optional(),
                number: z.number(),
                title: z.string(),
                state: z.string(),
                locked: z.boolean().optional(),
                body: z.string().nullable().optional(),
                user: UserSchema.nullable().optional(),
                labels: z.array(LabelSchema).optional(),
                assignees: z.array(UserSchema).optional(),
                milestone: MilestoneSchema.nullable().optional(),
                created_at: z.string().optional(),
                updated_at: z.string().optional(),
                closed_at: z.string().nullable().optional(),
                closed_by: UserSchema.nullable().optional(),
                author_association: z.string().optional(),
                comments: z.number().optional(),
                html_url: z.string().optional(),
                url: z.string().optional(),
                pull_request: PullRequestRefSchema.nullable().optional()
            })
            .parse(response.data);

        return {
            id: providerIssue.id,
            ...(providerIssue.node_id !== undefined && { node_id: providerIssue.node_id }),
            number: providerIssue.number,
            title: providerIssue.title,
            state: providerIssue.state,
            ...(providerIssue.locked !== undefined && { locked: providerIssue.locked }),
            ...(providerIssue.body !== undefined && { body: providerIssue.body }),
            ...(providerIssue.user !== undefined && { user: providerIssue.user }),
            ...(providerIssue.labels !== undefined && { labels: providerIssue.labels }),
            ...(providerIssue.assignees !== undefined && { assignees: providerIssue.assignees }),
            ...(providerIssue.milestone !== undefined && { milestone: providerIssue.milestone }),
            ...(providerIssue.created_at !== undefined && { created_at: providerIssue.created_at }),
            ...(providerIssue.updated_at !== undefined && { updated_at: providerIssue.updated_at }),
            ...(providerIssue.closed_at !== undefined && { closed_at: providerIssue.closed_at }),
            ...(providerIssue.closed_by !== undefined && { closed_by: providerIssue.closed_by }),
            ...(providerIssue.author_association !== undefined && { author_association: providerIssue.author_association }),
            ...(providerIssue.comments !== undefined && { comments: providerIssue.comments }),
            ...(providerIssue.html_url !== undefined && { html_url: providerIssue.html_url }),
            ...(providerIssue.url !== undefined && { url: providerIssue.url }),
            ...(providerIssue.pull_request !== undefined && { pull_request: providerIssue.pull_request })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
