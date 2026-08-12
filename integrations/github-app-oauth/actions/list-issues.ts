import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps".'),
        repo: z.string().describe('Repository name. Example: "nango".'),
        state: z.enum(['open', 'closed', 'all']).optional().describe('Issue state filter. Defaults to "open".'),
        labels: z.string().optional().describe('Comma-separated list of label names to filter by. Example: "bug,help wanted".'),
        sort: z.enum(['created', 'updated', 'comments']).optional().describe('Sort criteria. Defaults to "created".'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page (max 100). Defaults to 30.'),
        cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
    })
    .describe('Input for listing repository issues and pull requests.');

const ProviderLabelSchema = z.object({
    name: z.string()
});

const ProviderUserSchema = z.object({
    login: z.string()
});

const ProviderIssueSchema = z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    state: z.string(),
    state_reason: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    user: ProviderUserSchema.optional(),
    labels: z.array(ProviderLabelSchema).optional(),
    assignees: z.array(ProviderUserSchema).optional(),
    comments: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable().optional(),
    pull_request: z.object({}).optional()
});

const IssueSchema = z
    .object({
        id: z.number().describe('Unique issue ID.'),
        number: z.number().describe('Issue number within the repository.'),
        title: z.string().describe('Issue title.'),
        state: z.string().describe('Issue state. Example: "open" or "closed".'),
        state_reason: z.string().optional().describe('Reason for the state. Example: "completed" or "not_planned".'),
        body: z.string().optional().describe('Issue body text.'),
        user_login: z.string().optional().describe('Login of the issue creator.'),
        labels: z.array(z.string()).describe('Label names attached to the issue.'),
        assignees: z.array(z.string()).describe('Login names of assigned users.'),
        comments_count: z.number().describe('Number of comments on the issue.'),
        created_at: z.string().describe('ISO 8601 timestamp when the issue was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the issue was last updated.'),
        closed_at: z.string().optional().describe('ISO 8601 timestamp when the issue was closed.'),
        is_pull_request: z.boolean().describe('True when the item is actually a pull request.')
    })
    .describe('A repository issue or pull request.');

const OutputSchema = z
    .object({
        items: z.array(IssueSchema).describe('List of issues and pull requests.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page.')
    })
    .describe('Output containing a page of repository issues and pull requests.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of issues and pull requests from a GitHub repository.
 * @pitfalls: On repositories with Issues disabled, this endpoint returns only pull requests and never true issues; use `is_pull_request` to distinguish them.
 */
const action = createAction({
    description: 'List issues (and pull requests) in a repository',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string representing a page number'
            });
        }

        const page = input.cursor ? Number(input.cursor) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number'
            });
        }

        const perPage = input.per_page ?? 30;

        const config: ProxyConfiguration = {
            // https://docs.github.com/rest/issues/issues#list-repository-issues
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues`,
            params: {
                state: input.state ?? 'open',
                ...(input.labels !== undefined && { labels: input.labels }),
                sort: input.sort ?? 'created',
                per_page: perPage,
                page
            },
            retries: 3
        };

        const response = await nango.get(config);

        const rawIssues = z.array(z.unknown()).parse(response.data);
        const items = rawIssues.map((item) => {
            const issue = ProviderIssueSchema.parse(item);
            return {
                id: issue.id,
                number: issue.number,
                title: issue.title,
                state: issue.state,
                ...(issue.state_reason != null && { state_reason: issue.state_reason }),
                ...(issue.body != null && { body: issue.body }),
                ...(issue.user != null && { user_login: issue.user.login }),
                labels: (issue.labels ?? []).map((label) => label.name),
                assignees: (issue.assignees ?? []).map((assignee) => assignee.login),
                comments_count: issue.comments,
                created_at: issue.created_at,
                updated_at: issue.updated_at,
                ...(issue.closed_at != null && { closed_at: issue.closed_at }),
                is_pull_request: issue.pull_request !== undefined
            };
        });

        return {
            items,
            ...(items.length === perPage && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
