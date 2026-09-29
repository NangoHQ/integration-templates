import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository without the .git extension. The name is not case sensitive. Example: "nango"'),
        pull_number: z.number().int().describe('The number that identifies the pull request. Example: 22'),
        commit_title: z
            .string()
            .optional()
            .describe('Title for the automatic commit message. Defaults to the pull request title when omitted. Example: "Add new feature"'),
        commit_message: z.string().optional().describe('Extra detail to append to the automatic commit message.'),
        merge_method: z
            .enum(['merge', 'squash', 'rebase'])
            .optional()
            .describe('The merge method to use. Must be enabled in the repository settings. Defaults to "merge".')
    })
    .describe('Identifies the repository and pull request to merge, with optional merge commit customization.');

const ProviderMergeResponseSchema = z.object({
    sha: z.string(),
    merged: z.boolean(),
    message: z.string()
});

const OutputSchema = z
    .object({
        sha: z
            .string()
            .describe(
                'The SHA of the resulting commit on the base branch: the merge commit for "merge", the squashed commit for "squash", or the commit the base branch was updated to for "rebase".'
            ),
        merged: z.boolean().describe('Whether the pull request was merged. True on a successful response.'),
        message: z.string().describe('A message describing the merge result. Example: "Pull Request successfully merged"')
    })
    .describe('The result of merging the pull request.');

/**
 * @tags: [write, destructive]
 * @tagReason: Merging a pull request writes a commit to the base branch and closes the pull request, which cannot be un-merged through the API.
 * @pitfalls: GitHub computes mergeability in the background, so merging a pull request immediately after it is created or updated can transiently fail with a 405 "Base branch was modified" error; retrying after a few seconds usually succeeds. Merging an already-merged pull request still returns a successful response, so a 200 does not prove this call performed the merge.
 */
const action = createAction({
    description: 'Merge a pull request',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request
        const config: ProxyConfiguration = {
            // https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}/merge`,
            data: {
                ...(input.commit_title !== undefined && { commit_title: input.commit_title }),
                ...(input.commit_message !== undefined && { commit_message: input.commit_message }),
                ...(input.merge_method !== undefined && { merge_method: input.merge_method })
            },
            retries: 3
        };

        const response = await nango.put(config);

        const merge = ProviderMergeResponseSchema.parse(response.data);

        return {
            sha: merge.sha,
            merged: merge.merged,
            message: merge.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
