import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive.'),
        pull_number: z.number().describe('The number that identifies the pull request.'),
        per_page: z.number().optional().describe('The number of results per page (max 100).'),
        page: z.number().optional().describe('Page number of the results to fetch.')
    })
    .describe('Input parameters for listing pull request reviews.');

const ReviewUserSchema = z
    .object({
        login: z.string().describe('The username of the user.')
    })
    .passthrough()
    .describe('A GitHub user who submitted the review.');

const RawReviewSchema = z.object({
    id: z.number(),
    user: ReviewUserSchema.nullable().optional(),
    body: z.string().nullable().optional(),
    state: z.string(),
    html_url: z.string(),
    pull_request_url: z.string(),
    submitted_at: z.string().nullable().optional(),
    commit_id: z.string()
});

const ReviewSchema = z
    .object({
        id: z.number().describe('Unique identifier of the review.'),
        user: ReviewUserSchema.optional().describe('The user who submitted the review.'),
        body: z.string().optional().describe('The body text of the review.'),
        state: z.string().describe('The state of the review. For example: APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED, or PENDING.'),
        html_url: z.string().describe('URL to view the review on GitHub.'),
        pull_request_url: z.string().describe('URL to the pull request.'),
        submitted_at: z.string().optional().describe('The timestamp when the review was submitted.'),
        commit_id: z.string().describe('The SHA of the commit being reviewed.')
    })
    .describe('A pull request review.');

const OutputSchema = z
    .object({
        reviews: z.array(ReviewSchema).describe('The list of pull request reviews.'),
        next_page: z.number().optional().describe('The next page number if more results may be available.')
    })
    .describe('Output containing the list of pull request reviews and pagination information.');

/**
 * @tags: [read]
 * @tagReason: Lists existing reviews on a pull request without modifying any data.
 * @pitfalls: GitHub excludes pending (unsubmitted) reviews from the returned list; only submitted reviews are visible.
 */
const action = createAction({
    description: 'List reviews submitted on a pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const perPage = input.per_page ?? 30;
        const page = input.page ?? 1;

        // https://docs.github.com/en/rest/pulls/reviews#list-reviews-for-a-pull-request
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}/reviews`,
            params: {
                per_page: perPage,
                page: page
            },
            retries: 3
        });

        const rawReviews = z.array(z.unknown()).parse(response.data);

        const reviews = rawReviews.map((item: unknown) => {
            const parsed = RawReviewSchema.parse(item);

            return {
                id: parsed.id,
                ...(parsed.user !== undefined && parsed.user !== null && { user: parsed.user }),
                ...(parsed.body !== undefined && parsed.body !== null && { body: parsed.body }),
                state: parsed.state,
                html_url: parsed.html_url,
                pull_request_url: parsed.pull_request_url,
                ...(parsed.submitted_at !== undefined && parsed.submitted_at !== null && { submitted_at: parsed.submitted_at }),
                commit_id: parsed.commit_id
            };
        });

        const hasNextPage = rawReviews.length === perPage;

        return {
            reviews,
            ...(hasNextPage && { next_page: page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
