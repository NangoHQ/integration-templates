import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository.'),
        repo: z.string().describe('The name of the repository without the .git extension.'),
        pull_number: z.number().int().describe('The number that identifies the pull request.'),
        reviewers: z.array(z.string()).optional().describe('An array of user logins to request a review from.'),
        team_reviewers: z.array(z.string()).optional().describe('An array of team slugs to request a review from.')
    })
    .refine((data) => (data.reviewers !== undefined && data.reviewers.length > 0) || (data.team_reviewers !== undefined && data.team_reviewers.length > 0), {
        message: 'At least one reviewer or team_reviewer must be provided.'
    })
    .describe('Input to request reviewers or teams on a pull request.');

const ProviderUserSchema = z.object({
    login: z.string(),
    id: z.number().int(),
    type: z.string()
});

const ProviderTeamSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    slug: z.string()
});

const ProviderPullRequestSchema = z.object({
    number: z.number().int(),
    html_url: z.string(),
    requested_reviewers: z.array(ProviderUserSchema).optional().default([]),
    requested_teams: z.array(ProviderTeamSchema).optional().default([])
});

const OutputSchema = z
    .object({
        pull_request_number: z.number().int().describe('The pull request number.'),
        pull_request_url: z.string().describe('The URL of the pull request in the browser.'),
        requested_reviewers: z
            .array(
                z.object({
                    login: z.string().describe('The login name of the requested reviewer.'),
                    id: z.number().int().describe('The unique identifier of the requested reviewer.'),
                    type: z.string().describe('The type of user (e.g., User, Bot).')
                })
            )
            .describe('Users whose review has been requested.'),
        requested_teams: z
            .array(
                z.object({
                    id: z.number().int().describe('The unique identifier of the requested team.'),
                    name: z.string().describe('The name of the requested team.'),
                    slug: z.string().describe('The slug of the requested team.')
                })
            )
            .describe('Teams whose review has been requested.')
    })
    .describe('Output after requesting reviewers or teams on a pull request.');

/**
 * @tags: [write]
 * @tagReason: Creates review requests on an open pull request, which sends notifications to the requested users and teams.
 * @pitfalls: Requested users and teams must be repository collaborators; otherwise GitHub returns 422. Rapid repeated calls may trigger secondary rate limiting.
 */
const action = createAction({
    description: 'Request reviewers or teams on an open pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/pulls/review-requests#create-a-review-request-for-a-pull-request
        const response = await nango.post({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}/requested_reviewers`,
            data: {
                ...(input.reviewers !== undefined && input.reviewers.length > 0 && { reviewers: input.reviewers }),
                ...(input.team_reviewers !== undefined && input.team_reviewers.length > 0 && { team_reviewers: input.team_reviewers })
            },
            retries: 3
        });

        const pullRequest = ProviderPullRequestSchema.parse(response.data);

        return {
            pull_request_number: pullRequest.number,
            pull_request_url: pullRequest.html_url,
            requested_reviewers: pullRequest.requested_reviewers.map((reviewer) => ({
                login: reviewer.login,
                id: reviewer.id,
                type: reviewer.type
            })),
            requested_teams: pullRequest.requested_teams.map((team) => ({
                id: team.id,
                name: team.name,
                slug: team.slug
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
