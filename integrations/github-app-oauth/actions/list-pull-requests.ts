import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner login name. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        state: z.enum(['open', 'closed', 'all']).optional().describe('Filter by pull request state. Defaults to "open".'),
        base: z.string().optional().describe('Filter by base branch name the pull request targets. Example: "main"'),
        head: z
            .string()
            .optional()
            .describe('Filter by head branch name in the format user:ref-name or organization:ref-name. Example: "octocat:feature-branch"'),
        sort: z.enum(['created', 'updated', 'popularity', 'long-running']).optional().describe('Sort criteria. Defaults to "created".'),
        direction: z.enum(['asc', 'desc']).optional().describe('Sort direction. Defaults to "desc" for created/updated/popularity, "asc" for long-running.'),
        per_page: z.number().optional().describe('Number of results per page (max 100). Defaults to 30.'),
        page: z.number().optional().describe('Page number of results. Defaults to 1.')
    })
    .describe('Input parameters for listing pull requests in a repository.');

const UserSchema = z
    .object({
        login: z.string().describe('User login name.'),
        id: z.number().describe('Unique user identifier.'),
        avatar_url: z.string().optional().describe('URL of the user avatar image.'),
        html_url: z.string().optional().describe('URL to the user profile page.')
    })
    .passthrough();

const LabelSchema = z
    .object({
        id: z.number().describe('Unique label identifier.'),
        name: z.string().describe('Label name.'),
        color: z.string().optional().describe('Hex color code for the label.'),
        description: z.string().nullable().optional().describe('Label description.')
    })
    .passthrough();

const MilestoneSchema = z
    .object({
        id: z.number().describe('Unique milestone identifier.'),
        number: z.number().describe('Milestone number within the repository.'),
        title: z.string().describe('Milestone title.'),
        state: z.string().optional().describe('Milestone state: "open" or "closed".')
    })
    .passthrough();

const BranchRefSchema = z
    .object({
        ref: z.string().describe('Git reference name of the branch.'),
        sha: z.string().describe('SHA hash of the branch tip commit.'),
        user: UserSchema.nullable().optional().describe('User or organization that owns the branch repository.'),
        repo: z.record(z.string(), z.unknown()).nullable().optional().describe('Repository object the branch belongs to.')
    })
    .passthrough();

const PullRequestSchema = z
    .object({
        id: z.number().describe('Unique identifier for the pull request.'),
        number: z.number().describe('Pull request number within the repository.'),
        state: z.string().describe('State of the pull request: "open" or "closed".'),
        title: z.string().describe('Title of the pull request.'),
        body: z.string().nullable().optional().describe('Body content of the pull request.'),
        user: UserSchema.nullable().optional().describe('User who created the pull request.'),
        created_at: z.string().describe('ISO 8601 timestamp when the pull request was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the pull request was last updated.'),
        closed_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the pull request was closed, or null if open.'),
        merged_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the pull request was merged, or null if not merged.'),
        head: BranchRefSchema.nullable().optional().describe('The branch containing the changes.'),
        base: BranchRefSchema.nullable().optional().describe('The branch the pull request targets.'),
        draft: z.boolean().optional().describe('Whether the pull request is a draft.'),
        labels: z.array(LabelSchema).optional().describe('Labels attached to the pull request.'),
        milestone: MilestoneSchema.nullable().optional().describe('Milestone associated with the pull request.'),
        html_url: z.string().optional().describe('URL to view the pull request in a browser.'),
        url: z.string().optional().describe('API URL for the pull request.'),
        assignees: z.array(UserSchema).optional().describe('Users assigned to the pull request.'),
        requested_reviewers: z.array(UserSchema).optional().describe('Users requested to review the pull request.'),
        locked: z.boolean().optional().describe('Whether the pull request is locked.'),
        merge_commit_sha: z.string().nullable().optional().describe('SHA of the merge commit, or null if not merged.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        pull_requests: z.array(PullRequestSchema).describe('List of pull requests matching the query parameters.'),
        next_page: z.number().optional().describe('Next page number if more results are available, omitted on the last page.')
    })
    .describe('Output containing the list of pull requests and pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of pull requests from the repository.
 */
const action = createAction({
    description: 'List pull requests in a repository.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#list-pull-requests
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls`,
            params: {
                ...(input.state !== undefined && { state: input.state }),
                ...(input.base !== undefined && { base: input.base }),
                ...(input.head !== undefined && { head: input.head }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.direction !== undefined && { direction: input.direction }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        const pullRequests = z.array(PullRequestSchema).parse(response.data);

        const linkHeader = response.headers['link'];
        const hasNextPage = typeof linkHeader === 'string' && linkHeader.includes('rel="next"');
        const currentPage = input.page ?? 1;
        const nextPage = hasNextPage ? currentPage + 1 : undefined;

        return {
            pull_requests: pullRequests,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
