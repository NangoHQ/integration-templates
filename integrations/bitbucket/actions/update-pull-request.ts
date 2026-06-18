import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    pull_request_id: z.number().describe('Pull request ID. Example: 1'),
    title: z.string().optional().describe('Updated title for the pull request.'),
    description: z.string().optional().describe('Updated description for the pull request.'),
    destination: z
        .object({
            branch: z.object({
                name: z.string().describe('Destination branch name. Example: "main"')
            })
        })
        .optional()
        .describe('Updated destination branch for the pull request.'),
    reviewers: z
        .array(
            z.object({
                uuid: z.string().describe('User UUID. Example: "{a35738e8-3d79-470d-a80f-2a2fe4336964}"')
            })
        )
        .optional()
        .describe('Updated list of reviewers.')
});

const BranchSchema = z.object({
    name: z.string()
});

const RepositorySchema = z.object({
    type: z.string().optional(),
    name: z.string().optional(),
    full_name: z.string().optional(),
    uuid: z.string().optional()
});

const CommitSchema = z.object({
    hash: z.string().optional(),
    type: z.string().optional()
});

const SourceDestinationSchema = z.object({
    repository: RepositorySchema.optional(),
    branch: BranchSchema.optional(),
    commit: CommitSchema.optional()
});

const AccountSchema = z.object({
    type: z.string().optional(),
    uuid: z.string().optional(),
    display_name: z.string().optional(),
    account_id: z.string().optional()
});

const PullRequestSchema = z.object({
    id: z.number(),
    title: z.string(),
    description: z.string().optional(),
    state: z.string(),
    source: SourceDestinationSchema.optional(),
    destination: SourceDestinationSchema.optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    reviewers: z.array(AccountSchema).optional(),
    participants: z.array(AccountSchema).optional(),
    author: AccountSchema.optional(),
    close_source_branch: z.boolean().optional(),
    draft: z.boolean().optional(),
    merge_commit: z.object({ hash: z.string().optional() }).nullable().optional(),
    comment_count: z.number().optional(),
    task_count: z.number().optional(),
    reason: z.string().optional(),
    summary: z
        .object({
            raw: z.string().optional(),
            markup: z.string().optional(),
            html: z.string().optional()
        })
        .optional(),
    rendered: z
        .object({
            title: z
                .object({
                    raw: z.string().optional(),
                    markup: z.string().optional(),
                    html: z.string().optional()
                })
                .optional(),
            description: z
                .object({
                    raw: z.string().optional(),
                    markup: z.string().optional(),
                    html: z.string().optional()
                })
                .optional(),
            reason: z
                .object({
                    raw: z.string().optional(),
                    markup: z.string().optional(),
                    html: z.string().optional()
                })
                .optional()
        })
        .optional(),
    links: z.object({}).passthrough().optional(),
    type: z.string().optional()
});

const OutputSchema = PullRequestSchema;

const action = createAction({
    description: 'Update a pull request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pullrequest:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            title?: string;
            description?: string;
            destination?: z.infer<typeof InputSchema>['destination'];
            reviewers?: z.infer<typeof InputSchema>['reviewers'];
        } = {};

        if (input.title !== undefined) {
            body.title = input.title;
        }

        if (input.description !== undefined) {
            body.description = input.description;
        }

        if (input.destination !== undefined) {
            body.destination = input.destination;
        }

        if (input.reviewers !== undefined) {
            body.reviewers = input.reviewers;
        }

        // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-pull-request-id-put
        const response = await nango.put({
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/pullrequests/${encodeURIComponent(String(input.pull_request_id))}`,
            data: body,
            retries: 1
        });

        const pullRequest = PullRequestSchema.parse(response.data);

        return pullRequest;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
