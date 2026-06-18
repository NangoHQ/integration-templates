import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    title: z.string().describe('Pull request title. Example: "My PR"'),
    source_branch: z.string().describe('Source branch name. Example: "feature-branch"'),
    destination_branch: z.string().optional().describe('Destination branch name. Defaults to the repository main branch.'),
    description: z.string().optional().describe('Pull request description.'),
    reviewers: z.array(z.string()).optional().describe('Array of reviewer UUIDs. Example: ["{504c3b62-8120-4f0c-a7bc-87800b9d6f70}"]'),
    close_source_branch: z.boolean().optional().describe('Whether to close the source branch upon merging.')
});

const ReviewerOutputSchema = z.object({
    uuid: z.string().optional(),
    display_name: z.string().optional(),
    account_id: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    title: z.string(),
    description: z.string().optional(),
    state: z.string(),
    source_branch: z.string().optional(),
    destination_branch: z.string().optional(),
    close_source_branch: z.boolean().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    reviewers: z.array(ReviewerOutputSchema).optional()
});

const ProviderPullRequestSchema = z.object({
    id: z.number(),
    title: z.string(),
    description: z.string().nullable().optional(),
    state: z.string(),
    source: z
        .object({
            branch: z
                .object({
                    name: z.string().optional()
                })
                .optional()
        })
        .optional(),
    destination: z
        .object({
            branch: z
                .object({
                    name: z.string().optional()
                })
                .optional()
        })
        .optional(),
    close_source_branch: z.boolean().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    reviewers: z.array(z.object({}).passthrough()).optional()
});

const action = createAction({
    description: 'Create a pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pullrequest:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            title: input.title,
            source: {
                branch: {
                    name: input.source_branch
                }
            },
            ...(input.destination_branch !== undefined && {
                destination: {
                    branch: {
                        name: input.destination_branch
                    }
                }
            }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.close_source_branch !== undefined && { close_source_branch: input.close_source_branch }),
            ...(input.reviewers !== undefined && {
                reviewers: input.reviewers.map((uuid) => ({ uuid }))
            })
        };

        const response = await nango.post({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-post
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/pullrequests`,
            data: requestBody,
            retries: 10
        });

        const pr = ProviderPullRequestSchema.parse(response.data);

        return {
            id: pr.id,
            title: pr.title,
            ...(pr.description != null && { description: pr.description }),
            state: pr.state,
            ...(pr.source?.branch?.name != null && { source_branch: pr.source.branch.name }),
            ...(pr.destination?.branch?.name != null && { destination_branch: pr.destination.branch.name }),
            ...(pr.close_source_branch !== undefined && { close_source_branch: pr.close_source_branch }),
            ...(pr.created_on != null && { created_on: pr.created_on }),
            ...(pr.updated_on != null && { updated_on: pr.updated_on }),
            ...(pr.reviewers !== undefined && {
                reviewers: pr.reviewers.map((r) => ReviewerOutputSchema.parse(r))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
