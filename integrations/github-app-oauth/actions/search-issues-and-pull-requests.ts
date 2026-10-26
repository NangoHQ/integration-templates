import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        q: z.string().optional().describe('Free-form issue search keywords and qualifiers appended to the generated query. Example: "memory leak in:title".'),
        repository: z.string().optional().describe('Limit results to one repository in "owner/repo" format. Example: "octocat/Hello-World".'),
        type: z.enum(['issue', 'pull_request']).optional().describe('Restrict results to issues (is:issue) or pull requests (is:pr). Omit to return both.'),
        state: z.enum(['open', 'closed']).optional().describe('Restrict results to open or closed issues and pull requests.'),
        label: z.string().optional().describe('Only include items carrying this label. Example: "bug".'),
        assignee: z.string().optional().describe('Only include items assigned to this GitHub login. Example: "octocat".'),
        author: z.string().optional().describe('Only include items created by this GitHub login. Example: "octocat".'),
        sort: z
            .enum([
                'comments',
                'reactions',
                'reactions-+1',
                'reactions--1',
                'reactions-smile',
                'reactions-thinking_face',
                'reactions-heart',
                'reactions-tada',
                'interactions',
                'created',
                'updated'
            ])
            .optional()
            .describe('Field used to sort results. Defaults to best match. Example: "created".'),
        order: z.enum(['desc', 'asc']).optional().describe('Sort direction for the selected sort field. Defaults to "desc".'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page, from 1 to 100. Defaults to 30.'),
        page: z.number().int().min(1).optional().describe('Page number to fetch, starting at 1. Defaults to 1.')
    })
    .describe('Filters and pagination for searching GitHub issues and pull requests.');

const ProviderUserSchema = z.object({
    login: z.string(),
    id: z.number(),
    html_url: z.string(),
    avatar_url: z.string().optional(),
    type: z.string().optional()
});

const ProviderLabelSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    color: z.string().optional(),
    description: z.string().nullable().optional()
});

const ProviderPullRequestSchema = z.object({
    merged_at: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    diff_url: z.string().nullable().optional(),
    patch_url: z.string().nullable().optional()
});

const ProviderIssueSchema = z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    state: z.string(),
    state_reason: z.string().nullable().optional(),
    html_url: z.string(),
    url: z.string(),
    repository_url: z.string().optional(),
    body: z.string().nullable().optional(),
    user: ProviderUserSchema.nullable().optional(),
    labels: z.array(ProviderLabelSchema).optional(),
    assignees: z.array(ProviderUserSchema).nullable().optional(),
    locked: z.boolean().optional(),
    comments: z.number().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable().optional(),
    author_association: z.string().optional(),
    draft: z.boolean().optional(),
    score: z.number().optional(),
    pull_request: ProviderPullRequestSchema.optional()
});

const ProviderSearchSchema = z.object({
    total_count: z.number(),
    incomplete_results: z.boolean(),
    items: z.array(ProviderIssueSchema)
});

const OutputUserSchema = z.object({
    login: z.string().describe('GitHub login of the user. Example: "octocat".'),
    id: z.number().describe('Numeric GitHub user ID.'),
    html_url: z.string().describe('URL of the user profile on GitHub.')
});

const OutputLabelSchema = z.object({
    id: z.number().optional().describe('Numeric GitHub label ID.'),
    name: z.string().optional().describe('Label name. Example: "bug".'),
    color: z.string().optional().describe('Six-character hex color of the label without a leading hash.'),
    description: z.string().optional().describe('Label description, when one is set.')
});

const OutputPullRequestSchema = z.object({
    merged_at: z.string().optional().describe('ISO 8601 timestamp when the pull request was merged, if it was merged.'),
    html_url: z.string().optional().describe('URL of the pull request on GitHub.'),
    url: z.string().optional().describe('REST API URL of the pull request.'),
    diff_url: z.string().optional().describe('URL of the pull request diff.'),
    patch_url: z.string().optional().describe('URL of the pull request patch.')
});

const OutputIssueSchema = z.object({
    id: z.number().describe('Numeric GitHub issue or pull request ID.'),
    number: z.number().describe('Repository-scoped issue or pull request number.'),
    title: z.string().describe('Issue or pull request title.'),
    state: z.string().describe('Current state, such as "open" or "closed".'),
    state_reason: z.string().optional().describe('Reason the item was closed, such as "completed" or "not_planned".'),
    html_url: z.string().describe('URL of the issue or pull request on GitHub.'),
    url: z.string().describe('REST API URL of the issue or pull request.'),
    repository_url: z.string().optional().describe('REST API URL of the repository that contains the item.'),
    body: z.string().optional().describe('Markdown body of the issue or pull request.'),
    user: OutputUserSchema.optional().describe('User who created the issue or pull request.'),
    labels: z.array(OutputLabelSchema).describe('Labels currently attached to the issue or pull request.'),
    assignees: z.array(OutputUserSchema).optional().describe('Users currently assigned to the issue or pull request.'),
    locked: z.boolean().optional().describe('Whether the conversation is locked.'),
    comments: z.number().optional().describe('Number of comments on the issue or pull request.'),
    created_at: z.string().describe('ISO 8601 timestamp when the issue or pull request was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the issue or pull request was last updated.'),
    closed_at: z.string().optional().describe('ISO 8601 timestamp when the issue or pull request was closed, if it is closed.'),
    author_association: z.string().optional().describe('Author relationship to the repository, such as "OWNER", "MEMBER", or "CONTRIBUTOR".'),
    draft: z.boolean().optional().describe('Whether the pull request is a draft; only present for pull requests.'),
    is_pull_request: z.boolean().describe('Whether the search result is a pull request rather than an issue.'),
    pull_request: OutputPullRequestSchema.optional().describe('Pull request-specific URLs and merge details; only present for pull requests.'),
    score: z.number().optional().describe('Relevance score assigned by GitHub search.')
});

const OutputSchema = z
    .object({
        total_count: z.number().describe('Total number of items matching the query across all pages.'),
        incomplete_results: z.boolean().describe('Whether GitHub timed out before returning every matching result.'),
        items: z.array(OutputIssueSchema).describe('Issues and pull requests matching the query for the requested page.'),
        next_page: z.number().int().optional().describe('Page number to request next. Omitted on the last accessible page.')
    })
    .describe('Paginated GitHub issue and pull request search results.');

function toUser(user: z.infer<typeof ProviderUserSchema>): z.infer<typeof OutputUserSchema> {
    return {
        login: user.login,
        id: user.id,
        html_url: user.html_url
    };
}

function getNextPage(linkHeader: unknown): number | undefined {
    if (typeof linkHeader !== 'string') {
        return undefined;
    }
    const match = linkHeader.match(/<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="next"/);
    return match?.[1] !== undefined ? Number(match[1]) : undefined;
}

/**
 * @tags: [read]
 * @tagReason: Searches GitHub issues and pull requests without modifying any provider data.
 * @pitfalls: GitHub only makes the first 1,000 matches retrievable even when total_count is higher, caps authenticated search at 30 requests per minute; incomplete_results=true means a timeout truncated the results.
 */
const action = createAction({
    description: "Search issues and pull requests across indexed repositories using GitHub's issue-search qualifiers.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:read', 'pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const queryParts: string[] = [];

        if (input.q !== undefined && input.q.trim() !== '') {
            queryParts.push(input.q.trim());
        }
        if (input.type !== undefined) {
            queryParts.push(input.type === 'pull_request' ? 'is:pr' : 'is:issue');
        }
        if (input.repository !== undefined && input.repository.trim() !== '') {
            queryParts.push(`repo:${input.repository.trim()}`);
        }
        if (input.state !== undefined) {
            queryParts.push(`state:${input.state}`);
        }
        if (input.label !== undefined && input.label.trim() !== '') {
            const escapedLabel = input.label.trim().replace(/"/g, '');
            queryParts.push(`label:"${escapedLabel}"`);
        }
        if (input.assignee !== undefined && input.assignee.trim() !== '') {
            queryParts.push(`assignee:${input.assignee.trim()}`);
        }
        if (input.author !== undefined && input.author.trim() !== '') {
            queryParts.push(`author:${input.author.trim()}`);
        }

        const q = queryParts.join(' ');

        if (q === '') {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide q or at least one search filter such as repository, type, state, label, assignee, or author.'
            });
        }

        // https://docs.github.com/en/rest/search/search#search-issues-and-pull-requests
        const response = await nango.get({
            endpoint: '/search/issues',
            params: {
                q,
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.page !== undefined && { page: input.page })
            },
            retries: 3
        });

        const result = ProviderSearchSchema.parse(response.data);
        const nextPage = getNextPage(response.headers?.['link']);

        return {
            total_count: result.total_count,
            incomplete_results: result.incomplete_results,
            items: result.items.map((item) => ({
                id: item.id,
                number: item.number,
                title: item.title,
                state: item.state,
                ...(item.state_reason != null && { state_reason: item.state_reason }),
                html_url: item.html_url,
                url: item.url,
                ...(item.repository_url !== undefined && { repository_url: item.repository_url }),
                ...(item.body != null && { body: item.body }),
                ...(item.user != null && { user: toUser(item.user) }),
                labels: (item.labels ?? []).map((label) => ({
                    ...(label.id !== undefined && { id: label.id }),
                    ...(label.name !== undefined && { name: label.name }),
                    ...(label.color !== undefined && { color: label.color }),
                    ...(label.description != null && { description: label.description })
                })),
                ...(item.assignees != null && { assignees: item.assignees.map(toUser) }),
                ...(item.locked !== undefined && { locked: item.locked }),
                ...(item.comments !== undefined && { comments: item.comments }),
                created_at: item.created_at,
                updated_at: item.updated_at,
                ...(item.closed_at != null && { closed_at: item.closed_at }),
                ...(item.author_association !== undefined && { author_association: item.author_association }),
                ...(item.draft !== undefined && { draft: item.draft }),
                is_pull_request: item.pull_request != null,
                ...(item.pull_request != null && {
                    pull_request: {
                        ...(item.pull_request.merged_at != null && { merged_at: item.pull_request.merged_at }),
                        ...(item.pull_request.html_url != null && { html_url: item.pull_request.html_url }),
                        ...(item.pull_request.url != null && { url: item.pull_request.url }),
                        ...(item.pull_request.diff_url != null && { diff_url: item.pull_request.diff_url }),
                        ...(item.pull_request.patch_url != null && { patch_url: item.pull_request.patch_url })
                    }
                }),
                ...(item.score !== undefined && { score: item.score })
            })),
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
