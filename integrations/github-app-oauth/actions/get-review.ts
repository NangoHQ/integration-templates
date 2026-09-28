import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive.'),
        pull_number: z.number().describe('The number that identifies the pull request.'),
        review_id: z.number().describe('The unique identifier of the review.')
    })
    .describe('Input parameters for retrieving a pull request review by ID.');

const ProviderUserSchema = z.object({
    login: z.string(),
    id: z.number()
});

const ProviderReviewSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    user: ProviderUserSchema.nullable(),
    body: z.string(),
    state: z.string(),
    html_url: z.string(),
    pull_request_url: z.string(),
    submitted_at: z.string().optional(),
    commit_id: z.string().nullable(),
    author_association: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the review.'),
        node_id: z.string().describe('The GraphQL node ID for the review.'),
        user: z
            .object({
                login: z.string().describe('The username of the review author.'),
                id: z.number().describe('The unique identifier of the review author.')
            })
            .nullable()
            .describe('The user who wrote the review, or null if the account has been deleted.'),
        body: z.string().describe('The text content of the review.'),
        state: z.string().describe('The state of the review. Example: "COMMENT", "APPROVE", "REQUEST_CHANGES".'),
        html_url: z.string().describe('The URL to view the review in a browser.'),
        pull_request_url: z.string().describe('The API URL of the pull request.'),
        submitted_at: z.string().optional().describe('The timestamp when the review was submitted, in ISO 8601 format.'),
        commit_id: z.string().nullable().describe('The SHA of the commit that the review was left on.'),
        author_association: z.string().describe("The author's association with the repository.")
    })
    .describe('A single pull request review retrieved from the GitHub API.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single pull request review by its ID from the GitHub API.
 * @pitfalls: Reviews in the PENDING state omit submitted_at because they have not been submitted yet.
 */
const action = createAction({
    description: 'Retrieve a pull request review by review ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/pulls/reviews#get-a-review-for-a-pull-request
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}/reviews/${input.review_id}`,
            retries: 3
        });

        const review = ProviderReviewSchema.parse(response.data);

        return {
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
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
