import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner username. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "hello-world"'),
        state: z.enum(['open', 'closed', 'all']).optional().describe('Issue state filter. Example: "open"'),
        labels: z.string().optional().describe('Comma-separated list of label names. Example: "bug,urgent"'),
        sort: z.enum(['created', 'updated', 'comments']).optional().describe('Sort field. Example: "created"'),
        per_page: z.number().optional().describe('Results per page (max 100). Example: 30'),
        page: z.number().optional().describe('Page number. Example: 1')
    })
    .describe('Input parameters for listing issues and pull requests in a GitHub repository');

const IssueItemSchema = z
    .object({
        id: z.number().describe('GitHub issue ID'),
        number: z.number().describe('Issue or pull request number in the repository'),
        title: z.string().describe('Title of the issue or pull request'),
        state: z.string().describe('State, such as "open" or "closed"'),
        body: z.string().optional().describe('Body content'),
        html_url: z.string().describe('URL to view in a browser'),
        url: z.string().describe('API URL for this issue'),
        locked: z.boolean().describe('Whether the item is locked'),
        comments: z.number().describe('Number of comments'),
        created_at: z.string().describe('ISO 8601 creation timestamp'),
        updated_at: z.string().describe('ISO 8601 last update timestamp'),
        closed_at: z.string().optional().describe('ISO 8601 close timestamp'),
        user: z
            .object({
                login: z.string().describe('Username of the creator'),
                id: z.number().describe('User ID of the creator')
            })
            .passthrough()
            .optional()
            .describe('Creator of the issue'),
        labels: z
            .array(
                z
                    .object({
                        id: z.number().optional().describe('Label ID'),
                        name: z.string().describe('Label name'),
                        color: z.string().optional().nullable().describe('Label color hex code'),
                        description: z.string().optional().nullable().describe('Label description')
                    })
                    .passthrough()
            )
            .optional()
            .describe('Labels attached to the item'),
        assignees: z
            .array(
                z
                    .object({
                        login: z.string().describe('Username'),
                        id: z.number().optional().describe('User ID')
                    })
                    .passthrough()
            )
            .optional()
            .describe('Assigned users'),
        milestone: z.object({}).passthrough().optional().describe('Associated milestone'),
        pull_request: z
            .object({
                url: z.string().describe('API URL for the pull request'),
                html_url: z.string().optional().describe('Browser URL for the pull request')
            })
            .passthrough()
            .optional()
            .describe('Present when the item is a pull request rather than a true issue')
    })
    .passthrough();

const OutputSchema = z
    .object({
        issues: z.array(IssueItemSchema).describe('Array of issues and pull requests returned by GitHub'),
        next_page: z.number().optional().describe('Next page number when more results are available')
    })
    .describe('Response containing issues and pull requests with optional next page number');

/**
 * @tags: [read]
 * @tagReason: Reads issues and pull requests from a GitHub repository via the REST API.
 * @pitfalls: This endpoint always returns issues and pull requests intermixed with no API filter to exclude pull requests; on repositories with Issues disabled it succeeds but returns only pull requests, so filter client-side by the absence of the `pull_request` field to obtain true issues only.
 */
const action = createAction({
    description: 'List issues (and, per GitHub API design, pull requests too) in a repository',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/rest/issues/issues#list-repository-issues
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues`,
            params: {
                ...(input.state !== undefined && { state: input.state }),
                ...(input.labels !== undefined && { labels: input.labels }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        const rawIssues = z.array(z.unknown()).parse(response.data);
        const issues = rawIssues.map((item: unknown) => {
            const obj = z.object({}).passthrough().parse(item);
            const result: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(obj)) {
                if (key === 'body' || key === 'closed_at' || key === 'milestone' || key === 'user' || key === 'pull_request') {
                    continue;
                }
                result[key] = value;
            }
            if (typeof obj['body'] === 'string') {
                result['body'] = obj['body'];
            }
            if (typeof obj['closed_at'] === 'string') {
                result['closed_at'] = obj['closed_at'];
            }
            if (obj['milestone'] !== null && typeof obj['milestone'] === 'object') {
                result['milestone'] = obj['milestone'];
            }
            if (obj['user'] !== null && typeof obj['user'] === 'object') {
                result['user'] = obj['user'];
            }
            if (obj['pull_request'] !== undefined && obj['pull_request'] !== null) {
                result['pull_request'] = obj['pull_request'];
            }
            return result;
        });

        const linkHeader = typeof response.headers?.['link'] === 'string' ? response.headers['link'] : undefined;
        const hasNextPage = linkHeader !== undefined && linkHeader.includes('rel="next"');
        const nextPage = input.page !== undefined ? input.page + 1 : 2;

        return {
            issues: z.array(IssueItemSchema).parse(issues),
            ...(hasNextPage && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
