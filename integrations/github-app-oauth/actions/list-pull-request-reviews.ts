import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive.'),
        pull_number: z.number().describe('The number that identifies the pull request.'),
        cursor: z
            .string()
            .regex(/^\d+$/)
            .optional()
            .describe('Pagination cursor representing the page number to fetch. Omit for the first page.'),
        per_page: z.number().optional().describe('The number of results per page (max 100). Defaults to 30 if omitted.')
    })
    .describe('Input parameters for listing pull request reviews.');

const UserSchema = z.object({
    login: z.string().describe('The login username of the reviewer.'),
    id: z.number().describe('The unique identifier of the reviewer user.'),
    node_id: z.string().describe('The global node ID of the reviewer user.'),
    avatar_url: z.string().describe("The URL of the reviewer's avatar image."),
    html_url: z.string().describe("The URL to the reviewer's GitHub profile.")
});

const ReviewSchema = z.object({
    id: z.number().describe('The unique identifier of the review.'),
    node_id: z.string().describe('The global node ID of the review.'),
    user: UserSchema.nullable().describe('The user who submitted the review, or null if the account has been deleted.'),
    body: z.string().describe('The body text of the review.'),
    state: z.string().describe('The state of the review (e.g., COMMENTED, APPROVED, CHANGES_REQUESTED).'),
    html_url: z.string().describe('The URL to the review on GitHub.'),
    pull_request_url: z.string().describe('The URL to the associated pull request.'),
    submitted_at: z.string().optional().describe('The timestamp when the review was submitted, in ISO 8601 format.'),
    commit_id: z.string().nullable().describe('The SHA of the commit that was reviewed.'),
    author_association: z.string().describe("The author's association with the repository.")
});

const OutputSchema = z
    .object({
        reviews: z.array(ReviewSchema).describe('The list of pull request reviews.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page of results. Omitted when there are no more pages.')
    })
    .describe('Output containing a list of pull request reviews and an optional pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads reviews from a pull request via the GitHub API.
 * @pitfalls: Reviews in the PENDING state omit submitted_at because they have not been formally submitted.
 */
const action = createAction({
    description: 'List reviews submitted on a pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        const perPage = input.per_page ?? 30;

        // https://docs.github.com/en/rest/pulls/reviews?apiVersion=2022-11-28#list-reviews-for-a-pull-request
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}/reviews`,
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const providerReviews = z
            .array(
                z.object({
                    id: z.number(),
                    node_id: z.string(),
                    user: z
                        .object({
                            login: z.string(),
                            id: z.number(),
                            node_id: z.string(),
                            avatar_url: z.string(),
                            html_url: z.string()
                        })
                        .nullable(),
                    body: z.string(),
                    state: z.string(),
                    html_url: z.string(),
                    pull_request_url: z.string(),
                    submitted_at: z.string().optional(),
                    commit_id: z.string().nullable(),
                    author_association: z.string()
                })
            )
            .parse(response.data);

        const reviews = providerReviews.map((review) => ({
            id: review.id,
            node_id: review.node_id,
            user: review.user,
            body: review.body,
            state: review.state,
            html_url: review.html_url,
            pull_request_url: review.pull_request_url,
            ...(review.submitted_at !== undefined && { submitted_at: review.submitted_at }),
            commit_id: review.commit_id,
            author_association: review.author_association
        }));

        const nextCursor = providerReviews.length === perPage ? String(page + 1) : undefined;

        return {
            reviews,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
