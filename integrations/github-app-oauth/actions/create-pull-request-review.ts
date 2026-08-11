import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner login name. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        pull_number: z.number().describe('Pull request number. Example: 1'),
        body: z.string().optional().describe('The body text of the review. Optional when event is "APPROVE", otherwise recommended.'),
        event: z
            .enum(['COMMENT', 'APPROVE', 'REQUEST_CHANGES'])
            .describe('Review event type. COMMENT leaves a review comment, APPROVE approves the PR, REQUEST_CHANGES requests changes.')
    })
    .describe('Input to submit a review on a pull request.');

const ProviderUserSchema = z.object({
    login: z.string(),
    id: z.number()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique review ID.'),
        node_id: z.string().describe('Global node ID for GitHub GraphQL.'),
        user: z
            .object({
                login: z.string().describe('Review author login name.'),
                id: z.number().describe('Review author user ID.')
            })
            .describe('GitHub user who submitted the review.'),
        body: z.string().optional().describe('Body text of the review.'),
        state: z.string().describe('Review state, e.g. "COMMENTED", "APPROVED", or "CHANGES_REQUESTED".'),
        html_url: z.string().describe('URL to view the review in a browser.'),
        pull_request_url: z.string().describe('API URL of the pull request.'),
        commit_id: z.string().describe('SHA of the commit being reviewed.'),
        submitted_at: z.string().optional().describe('ISO 8601 timestamp when the review was submitted.')
    })
    .describe('The created pull request review.');

/**
 * @tags: [write]
 * @tagReason: Submits a review on a pull request, which creates a new provider-side review object.
 * @pitfalls: GitHub rejects an APPROVE review from the same identity that authored the PR (422 "Can not approve your own pull request").
 */
const action = createAction({
    description: 'Submit a review on a pull request (a comment, approval, or change request).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            body?: string;
            event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';
        } = {
            event: input.event
        };

        if (input.body !== undefined) {
            requestBody.body = input.body;
        }

        const response = await nango.post({
            // https://docs.github.com/rest/pulls/reviews#create-a-review-for-a-pull-request
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${encodeURIComponent(String(input.pull_number))}/reviews`,
            data: requestBody,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const providerReview = z
            .object({
                id: z.number(),
                node_id: z.string(),
                user: ProviderUserSchema,
                body: z.string().nullish(),
                state: z.string(),
                html_url: z.string(),
                pull_request_url: z.string(),
                commit_id: z.string(),
                submitted_at: z.string().nullish()
            })
            .parse(response.data);

        return {
            id: providerReview.id,
            node_id: providerReview.node_id,
            user: {
                login: providerReview.user.login,
                id: providerReview.user.id
            },
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
