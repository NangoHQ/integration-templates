import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('Project ID. Example: 82599306'),
    branch: z.string().describe('Branch name. Example: feature/test')
});

const CommitSchema = z.object({
    id: z.string(),
    short_id: z.string(),
    created_at: z.string(),
    parent_ids: z.array(z.string()),
    title: z.string(),
    message: z.string(),
    author_name: z.string(),
    author_email: z.string(),
    authored_date: z.string(),
    committer_name: z.string(),
    committer_email: z.string(),
    committed_date: z.string(),
    trailers: z.record(z.string(), z.unknown()),
    extended_trailers: z.record(z.string(), z.unknown()),
    web_url: z.string()
});

const ProviderBranchSchema = z.object({
    name: z.string(),
    merged: z.boolean(),
    protected: z.boolean(),
    default: z.boolean(),
    developers_can_push: z.boolean(),
    developers_can_merge: z.boolean(),
    can_push: z.boolean(),
    web_url: z.string(),
    commit: CommitSchema
});

const OutputSchema = ProviderBranchSchema;

const action = createAction({
    description: 'Retrieve a single branch from GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-branch',
        group: 'Branches'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.gitlab.com/api/branches/#get-a-single-repository-branch
        const response = await nango.get({
            endpoint: `/api/v4/projects/${encodeURIComponent(String(input.project_id))}/repository/branches/${encodeURIComponent(input.branch)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Branch not found',
                project_id: input.project_id,
                branch: input.branch
            });
        }

        const providerBranch = ProviderBranchSchema.parse(response.data);

        return providerBranch;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
