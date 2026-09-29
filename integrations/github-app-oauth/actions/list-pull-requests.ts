import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        state: z.enum(['open', 'closed', 'all']).optional().describe('Filter by pull request state. Defaults to "open" if omitted.'),
        base: z.string().optional().describe('Filter by the base branch name the pull request targets.'),
        head: z.string().optional().describe('Filter by the head branch. Use format user:ref-name or organization:ref-name for fork branches.'),
        sort: z.enum(['created', 'updated', 'popularity', 'long-running']).optional().describe('Sort criteria. Defaults to "created".'),
        direction: z.enum(['asc', 'desc']).optional().describe('Sort direction. Defaults to "desc" for created/updated/popularity, "asc" for long-running.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page, maximum 100. Defaults to 30.'),
        page: z.number().int().min(1).optional().describe('Page number of results to fetch. Defaults to 1.')
    })
    .describe('Input parameters for listing pull requests in a repository.');

const ProviderUserSchema = z.object({
    login: z.string(),
    id: z.number()
});

const ProviderLabelSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    color: z.string().optional(),
    description: z.string().nullable().optional()
});

const ProviderBranchRefSchema = z.object({
    ref: z.string(),
    sha: z.string(),
    repo: z.record(z.string(), z.unknown()).optional()
});

const ProviderPullRequestSchema = z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    state: z.string(),
    locked: z.boolean(),
    user: ProviderUserSchema.optional(),
    body: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable().optional(),
    merged_at: z.string().nullable().optional(),
    merge_commit_sha: z.string().nullable().optional(),
    assignee: ProviderUserSchema.nullable().optional(),
    assignees: z.array(ProviderUserSchema).optional(),
    requested_reviewers: z.array(ProviderUserSchema).optional(),
    requested_teams: z.array(z.record(z.string(), z.unknown())).optional(),
    labels: z.array(ProviderLabelSchema).optional(),
    milestone: z.record(z.string(), z.unknown()).nullable().optional(),
    draft: z.boolean().optional(),
    html_url: z.string(),
    head: ProviderBranchRefSchema,
    base: ProviderBranchRefSchema
});

const PullRequestSchema = z.object({
    id: z.number().describe('Unique pull request identifier across GitHub.'),
    number: z.number().describe('Pull request number within the repository.'),
    title: z.string().describe('Pull request title.'),
    state: z.string().describe('Pull request state: open, closed, or merged (merged appears as closed in list).'),
    locked: z.boolean().describe('Whether the pull request is locked.'),
    user_login: z.string().optional().describe('Login of the pull request author.'),
    user_id: z.number().optional().describe('GitHub user ID of the pull request author.'),
    body: z.string().optional().describe('Pull request body/description.'),
    created_at: z.string().describe('ISO 8601 timestamp when the pull request was created.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the pull request was last updated.'),
    closed_at: z.string().optional().describe('ISO 8601 timestamp when the pull request was closed, if applicable.'),
    merged_at: z.string().optional().describe('ISO 8601 timestamp when the pull request was merged, if applicable.'),
    merge_commit_sha: z.string().optional().describe('SHA of the merge commit, if available.'),
    assignee_login: z.string().optional().describe('Login of the assigned user, if any.'),
    assignees: z
        .array(
            z.object({
                login: z.string().describe('Login of the assignee.'),
                id: z.number().describe('GitHub user ID of the assignee.')
            })
        )
        .optional()
        .describe('Users assigned to the pull request.'),
    requested_reviewers: z
        .array(
            z.object({
                login: z.string().describe('Login of the requested reviewer.'),
                id: z.number().describe('GitHub user ID of the requested reviewer.')
            })
        )
        .optional()
        .describe('Users requested to review the pull request.'),
    labels: z
        .array(
            z.object({
                id: z.number().optional().describe('Label ID.'),
                name: z.string().optional().describe('Label name.'),
                color: z.string().optional().describe('Label color hex code.'),
                description: z.string().optional().describe('Label description.')
            })
        )
        .optional()
        .describe('Labels attached to the pull request.'),
    draft: z.boolean().optional().describe('Whether the pull request is a draft.'),
    html_url: z.string().describe('URL to view the pull request in a browser.'),
    head_ref: z.string().describe('Name of the branch the pull request merges from.'),
    head_sha: z.string().describe('SHA of the head commit.'),
    base_ref: z.string().describe('Name of the branch the pull request merges into.'),
    base_sha: z.string().describe('SHA of the base commit.')
});

const OutputSchema = z
    .object({
        pull_requests: z.array(PullRequestSchema).describe('Array of pull requests matching the query filters.'),
        next_page: z.number().optional().describe('Page number for the next page of results, if more may exist.')
    })
    .describe('Response containing an array of pull requests and optional next-page pagination.');

/**
 * @tags: [read]
 * @tagReason: Retrieves existing pull requests without modifying repository state.
 * @pitfalls: The head filter must use the format user:ref-name or organization:ref-name when the branch is on a fork; omitting the prefix silently returns no matches.
 */
const action = createAction({
    description: 'List pull requests in a repository.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.state !== undefined) {
            params['state'] = input.state;
        }
        if (input.base !== undefined) {
            params['base'] = input.base;
        }
        if (input.head !== undefined) {
            params['head'] = input.head;
        }
        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }
        if (input.direction !== undefined) {
            params['direction'] = input.direction;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.page !== undefined) {
            params['page'] = input.page;
        }

        // https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#list-pull-requests
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls`,
            params,
            retries: 3
        });

        const rawPulls = z.array(ProviderPullRequestSchema).safeParse(response.data);
        if (!rawPulls.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'GitHub API returned an unexpected pull request shape.',
                details: rawPulls.error.issues
            });
        }

        const pullRequests = rawPulls.data.map((pr) => ({
            id: pr.id,
            number: pr.number,
            title: pr.title,
            state: pr.state,
            locked: pr.locked,
            ...(pr.user && { user_login: pr.user.login, user_id: pr.user.id }),
            ...(pr.body != null && { body: pr.body }),
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            ...(pr.closed_at != null && { closed_at: pr.closed_at }),
            ...(pr.merged_at != null && { merged_at: pr.merged_at }),
            ...(pr.merge_commit_sha != null && { merge_commit_sha: pr.merge_commit_sha }),
            ...(pr.assignee != null && { assignee_login: pr.assignee.login }),
            assignees: pr.assignees,
            requested_reviewers: pr.requested_reviewers,
            labels: pr.labels?.map((label) => ({
                id: label.id,
                name: label.name,
                color: label.color,
                ...(label.description != null && { description: label.description })
            })),
            draft: pr.draft,
            html_url: pr.html_url,
            head_ref: pr.head.ref,
            head_sha: pr.head.sha,
            base_ref: pr.base.ref,
            base_sha: pr.base.sha
        }));

        const perPage = input.per_page ?? 30;
        const currentPage = input.page ?? 1;
        const hasMore = rawPulls.data.length === perPage;

        return {
            pull_requests: pullRequests,
            ...(hasMore && { next_page: currentPage + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
