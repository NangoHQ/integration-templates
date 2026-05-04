import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('Repository owner. Example: "octocat"'),
    repo: z.string().describe('Repository name. Example: "Hello-World"')
});

const OwnerSchema = z.object({
    login: z.string(),
    id: z.number(),
    type: z.string().optional()
});

const ProviderRepositorySchema = z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string().optional(),
    description: z.string().nullable().optional(),
    private: z.boolean(),
    visibility: z.string().optional(),
    default_branch: z.string().optional(),
    html_url: z.string().optional(),
    owner: OwnerSchema,
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    pushed_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string().optional(),
    description: z.string().optional(),
    private: z.boolean(),
    visibility: z.string().optional(),
    default_branch: z.string().optional(),
    html_url: z.string().optional(),
    owner: z.object({
        login: z.string(),
        id: z.number(),
        type: z.string().optional()
    }),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Retrieve repository metadata, visibility, default branch, and owner info.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-repository',
        group: 'Repositories'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/repos/repos#get-a-repository
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Repository not found',
                owner: input.owner,
                repo: input.repo
            });
        }

        const providerRepo = ProviderRepositorySchema.parse(response.data);

        return {
            id: providerRepo.id,
            name: providerRepo.name,
            ...(providerRepo.full_name !== undefined && { full_name: providerRepo.full_name }),
            ...(providerRepo.description != null && { description: providerRepo.description }),
            private: providerRepo.private,
            ...(providerRepo.visibility !== undefined && { visibility: providerRepo.visibility }),
            ...(providerRepo.default_branch !== undefined && { default_branch: providerRepo.default_branch }),
            ...(providerRepo.html_url !== undefined && { html_url: providerRepo.html_url }),
            owner: {
                login: providerRepo.owner.login,
                id: providerRepo.owner.id,
                ...(providerRepo.owner.type !== undefined && { type: providerRepo.owner.type })
            },
            ...(providerRepo.created_at !== undefined && { created_at: providerRepo.created_at }),
            ...(providerRepo.updated_at !== undefined && { updated_at: providerRepo.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
