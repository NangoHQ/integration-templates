import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('Account owner of the repository. Example: "octocat"'),
    repo: z.string().describe('Name of the repository. Example: "hello-world"'),
    pull_number: z.number().int().positive().describe('Number identifying the pull request. Example: 42'),
    commit_title: z.string().optional().describe('Title for the automatic commit message.'),
    commit_message: z.string().optional().describe('Extra detail to append to automatic commit message.'),
    sha: z.string().optional().describe('SHA that pull request head must match to allow merge.'),
    merge_method: z.enum(['merge', 'squash', 'rebase']).optional().describe('The merge method to use. Can be one of: merge, squash, rebase. Default: merge.')
});

const ProviderMergeResponseSchema = z.object({
    sha: z.string(),
    merged: z.boolean(),
    message: z.string()
});

const OutputSchema = z.object({
    sha: z.string(),
    merged: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Merge an open pull request using the selected merge method.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pull_requests:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request
        const response = await nango.put({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls/${input.pull_number}/merge`,
            data: {
                ...(input.commit_title !== undefined && { commit_title: input.commit_title }),
                ...(input.commit_message !== undefined && { commit_message: input.commit_message }),
                ...(input.sha !== undefined && { sha: input.sha }),
                ...(input.merge_method !== undefined && { merge_method: input.merge_method })
            },
            retries: 3
        });

        if (response.data && typeof response.data === 'object') {
            const parsed = ProviderMergeResponseSchema.parse(response.data);
            return {
                sha: parsed.sha,
                merged: parsed.merged,
                message: parsed.message
            };
        }

        throw new nango.ActionError({
            type: 'invalid_response',
            message: 'Unexpected response from GitHub API',
            response: response.data
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
