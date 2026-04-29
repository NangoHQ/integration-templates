import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
    repo: z.string().describe('The name of the repository. Example: "Hello-World"'),
    pull_number: z.number().int().positive().describe('The number that identifies the pull request. Example: 42'),
    per_page: z.number().int().positive().max(100).optional().describe('The number of results per page (max 100). Example: 30'),
    page: z.number().int().positive().optional().describe('Page number of the results to fetch. Example: 1')
});

const UserSchema = z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string().optional(),
    html_url: z.string().optional()
});

const ReviewSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    user: UserSchema.optional(),
    body: z.string().nullable(),
    state: z.string(),
    html_url: z.string(),
    pull_request_url: z.string(),
    commit_id: z.string(),
    submitted_at: z.string().optional()
});

const OutputSchema = z.object({
    reviews: z.array(ReviewSchema),
    total_count: z.number().optional()
});

const action = createAction({
    description: 'List reviews submitted on a pull request',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-pull-request-reviews',
        group: 'Pull Requests'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/pulls/reviews#list-reviews-for-a-pull-request
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}/reviews`,
            params: {
                ...(input.per_page !== undefined && { per_page: input.per_page.toString() }),
                ...(input.page !== undefined && { page: input.page.toString() })
            },
            retries: 3
        });

        const reviews = z.array(ReviewSchema).parse(response.data);

        return {
            reviews: reviews,
            total_count: reviews.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
