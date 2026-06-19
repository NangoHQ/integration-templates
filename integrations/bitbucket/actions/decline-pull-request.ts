import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    pull_request_id: z.number().describe('Pull request ID. Example: 1')
});

const PullRequestSchema = z
    .object({
        type: z.string().optional(),
        id: z.number().optional(),
        title: z.string().optional(),
        state: z.string().optional(),
        reason: z.string().nullable().optional(),
        created_on: z.string().optional(),
        updated_on: z.string().optional(),
        comment_count: z.number().optional(),
        task_count: z.number().optional(),
        close_source_branch: z.boolean().optional(),
        draft: z.boolean().optional(),
        mergeable: z.boolean().optional(),
        queued: z.boolean().optional(),
        links: z.record(z.string(), z.unknown()).nullable().optional(),
        author: z.record(z.string(), z.unknown()).nullable().optional(),
        source: z.record(z.string(), z.unknown()).nullable().optional(),
        destination: z.record(z.string(), z.unknown()).nullable().optional(),
        merge_commit: z.record(z.string(), z.unknown()).nullable().optional(),
        closed_by: z.record(z.string(), z.unknown()).nullable().optional(),
        rendered: z.record(z.string(), z.unknown()).nullable().optional(),
        summary: z.record(z.string(), z.unknown()).nullable().optional(),
        reviewers: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        participants: z.array(z.record(z.string(), z.unknown())).nullable().optional()
    })
    .passthrough();

const OutputSchema = PullRequestSchema;

const action = createAction({
    description: 'Decline (reject) a pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pullrequest:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-pull-request-id-decline-post
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/pullrequests/${encodeURIComponent(String(input.pull_request_id))}/decline`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Pull request not found or could not be declined.'
            });
        }

        const pullRequest = PullRequestSchema.parse(response.data);
        return pullRequest;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
