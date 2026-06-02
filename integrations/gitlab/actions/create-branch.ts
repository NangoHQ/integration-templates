import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('Project ID. Example: 82599306'),
    branch: z.string().describe('Name of the new branch. Example: "feature/my-branch"'),
    ref: z.string().describe('Branch name or commit SHA to create the branch from. Example: "main"')
});

const ProviderCommitSchema = z.object({
    id: z.string(),
    short_id: z.string().optional(),
    title: z.string().optional(),
    message: z.string().optional(),
    author_name: z.string().optional(),
    author_email: z.string().optional(),
    authored_date: z.string().optional(),
    committer_name: z.string().optional(),
    committer_email: z.string().optional(),
    committed_date: z.string().optional(),
    created_at: z.string().optional(),
    parent_ids: z.array(z.string()).optional(),
    trailers: z.record(z.string(), z.unknown()).optional(),
    extended_trailers: z.record(z.string(), z.unknown()).optional(),
    web_url: z.string().optional()
});

const ProviderBranchSchema = z.object({
    name: z.string(),
    merged: z.boolean().optional(),
    protected: z.boolean().optional(),
    default: z.boolean().optional(),
    developers_can_push: z.boolean().optional(),
    developers_can_merge: z.boolean().optional(),
    can_push: z.boolean().optional(),
    web_url: z.string().optional(),
    commit: ProviderCommitSchema.optional()
});

const OutputSchema = z.object({
    name: z.string(),
    merged: z.boolean().optional(),
    protected: z.boolean().optional(),
    default: z.boolean().optional(),
    developers_can_push: z.boolean().optional(),
    developers_can_merge: z.boolean().optional(),
    can_push: z.boolean().optional(),
    web_url: z.string().optional(),
    commit: z
        .object({
            id: z.string(),
            short_id: z.string().optional(),
            title: z.string().optional(),
            message: z.string().optional(),
            author_name: z.string().optional(),
            author_email: z.string().optional(),
            authored_date: z.string().optional(),
            committer_name: z.string().optional(),
            committer_email: z.string().optional(),
            committed_date: z.string().optional(),
            created_at: z.string().optional(),
            parent_ids: z.array(z.string()).optional(),
            web_url: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a branch in GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-branch',
        group: 'Branches'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.gitlab.com/api/branches/#create-repository-branch
            endpoint: `/api/v4/projects/${encodeURIComponent(String(input.project_id))}/repository/branches`,
            data: {
                branch: input.branch,
                ref: input.ref
            },
            retries: 10
        });

        const providerBranch = ProviderBranchSchema.parse(response.data);

        return {
            name: providerBranch.name,
            ...(providerBranch.merged !== undefined && { merged: providerBranch.merged }),
            ...(providerBranch.protected !== undefined && { protected: providerBranch.protected }),
            ...(providerBranch.default !== undefined && { default: providerBranch.default }),
            ...(providerBranch.developers_can_push !== undefined && { developers_can_push: providerBranch.developers_can_push }),
            ...(providerBranch.developers_can_merge !== undefined && { developers_can_merge: providerBranch.developers_can_merge }),
            ...(providerBranch.can_push !== undefined && { can_push: providerBranch.can_push }),
            ...(providerBranch.web_url != null && { web_url: providerBranch.web_url }),
            ...(providerBranch.commit != null && {
                commit: {
                    id: providerBranch.commit.id,
                    ...(providerBranch.commit.short_id != null && { short_id: providerBranch.commit.short_id }),
                    ...(providerBranch.commit.title != null && { title: providerBranch.commit.title }),
                    ...(providerBranch.commit.message != null && { message: providerBranch.commit.message }),
                    ...(providerBranch.commit.author_name != null && { author_name: providerBranch.commit.author_name }),
                    ...(providerBranch.commit.author_email != null && { author_email: providerBranch.commit.author_email }),
                    ...(providerBranch.commit.authored_date != null && { authored_date: providerBranch.commit.authored_date }),
                    ...(providerBranch.commit.committer_name != null && { committer_name: providerBranch.commit.committer_name }),
                    ...(providerBranch.commit.committer_email != null && { committer_email: providerBranch.commit.committer_email }),
                    ...(providerBranch.commit.committed_date != null && { committed_date: providerBranch.commit.committed_date }),
                    ...(providerBranch.commit.created_at != null && { created_at: providerBranch.commit.created_at }),
                    ...(providerBranch.commit.parent_ids != null && { parent_ids: providerBranch.commit.parent_ids }),
                    ...(providerBranch.commit.web_url != null && { web_url: providerBranch.commit.web_url })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
