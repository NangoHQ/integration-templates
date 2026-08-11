import { z } from 'zod';
import { createAction } from 'nango';

const MergeMethodSchema = z.enum(['merge', 'squash', 'rebase']);

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository.'),
        repo: z.string().describe('The name of the repository.'),
        pull_number: z.number().describe('The number that identifies the pull request.'),
        commit_title: z.string().optional().describe('Title for the automatic commit message.'),
        commit_message: z.string().optional().describe('Extra detail to append to automatic commit message.'),
        merge_method: MergeMethodSchema.optional().describe('The merge method to use. Defaults to merge if omitted.')
    })
    .describe('Parameters for merging a pull request.');

const ProviderMergeResponseSchema = z.object({
    sha: z.string(),
    merged: z.boolean(),
    message: z.string()
});

const OutputSchema = z
    .object({
        sha: z.string().describe('SHA of the merge commit.'),
        merged: z.boolean().describe('Whether the merge was successful.'),
        message: z.string().describe('A descriptive message about the merge result.')
    })
    .describe('Result of merging a pull request.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently merges a pull request into the base branch, rewriting history depending on the merge method.
 * @pitfalls: GitHub rejects the request with 405 when the PR is not mergeable, already closed or merged, or required status checks are failing, and with 409 if the head branch is modified during the request.
 */
const action = createAction({
    description: 'Merge a pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#merge-a-pull-request
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${encodeURIComponent(String(input.pull_number))}/merge`,
            data: {
                ...(input.commit_title !== undefined && { commit_title: input.commit_title }),
                ...(input.commit_message !== undefined && { commit_message: input.commit_message }),
                ...(input.merge_method !== undefined && { merge_method: input.merge_method })
            },
            retries: 3
        });

        const providerData = ProviderMergeResponseSchema.parse(response.data);

        return {
            sha: providerData.sha,
            merged: providerData.merged,
            message: providerData.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
