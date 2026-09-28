import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner login. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        pull_number: z.number().describe('Pull request number. Example: 1'),
        body: z.string().optional().describe('The body text of the review. Optional for APPROVE; typically required for COMMENT and REQUEST_CHANGES.'),
        event: z
            .enum(['COMMENT', 'APPROVE', 'REQUEST_CHANGES'])
            .describe(
                'The review action to perform. COMMENT leaves a review comment without changing approval state; APPROVE approves the PR; REQUEST_CHANGES requests changes before merging.'
            )
    })
    .describe('Input for creating a pull request review.');

const ProviderReviewSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    body: z.string().nullable(),
    state: z.string(),
    html_url: z.string(),
    pull_request_url: z.string(),
    commit_id: z.string(),
    submitted_at: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the review.'),
        node_id: z.string().describe('Global node ID for the review.'),
        body: z.string().optional().describe('The body text of the review.'),
        state: z.string().describe('The review state. Examples: "APPROVED", "COMMENTED", "CHANGES_REQUESTED".'),
        html_url: z.string().describe('URL to view the review in a browser.'),
        pull_request_url: z.string().describe('API URL of the associated pull request.'),
        commit_id: z.string().describe('The commit SHA the review was submitted against.'),
        submitted_at: z.string().optional().describe('ISO 8601 timestamp when the review was submitted.')
    })
    .describe('Output of a created pull request review.');

/**
 * @tags: [write]
 * @tagReason: Creates a new review on a pull request.
 * @pitfalls: GitHub rejects an APPROVE review from the same identity that authored or committed the PR (422 "Can not approve your own pull request").
 */
const action = createAction({
    description: 'Submit a review on a pull request (a comment, approval, or change request).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/rest/pulls/reviews#create-a-review-for-a-pull-request
        const response = await nango.post({
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${encodeURIComponent(String(input.pull_number))}/reviews`,
            data: {
                ...(input.body !== undefined && { body: input.body }),
                ...(input.event !== undefined && { event: input.event })
            },
            retries: 1
        });

        const providerReview = ProviderReviewSchema.parse(response.data);

        return {
            id: providerReview.id,
            node_id: providerReview.node_id,
            ...(providerReview.body != null && { body: providerReview.body }),
            state: providerReview.state,
            html_url: providerReview.html_url,
            pull_request_url: providerReview.pull_request_url,
            commit_id: providerReview.commit_id,
            ...(providerReview.submitted_at != null && { submitted_at: providerReview.submitted_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
