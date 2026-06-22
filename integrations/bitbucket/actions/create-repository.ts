import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "my-repo"'),
    scm: z.string().optional().describe('Source control management type. Example: "git"'),
    is_private: z.boolean().optional().describe('Whether the repository is private.'),
    description: z.string().optional().describe('Repository description.'),
    has_wiki: z.boolean().optional().describe('Whether the repository has a wiki.'),
    language: z.string().optional().describe('Programming language. Example: "typescript"'),
    project_key: z.string().optional().describe('Project key required if workspace has existing projects. Example: "PROJ"')
});

const ProviderProjectSchema = z.object({
    key: z.string().optional()
});

const ProviderWorkspaceSchema = z.object({
    slug: z.string().optional()
});

const ProviderOwnerSchema = z.object({
    username: z.string().optional(),
    uuid: z.string().optional()
});

const ProviderRepositorySchema = z.object({
    uuid: z.string().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    full_name: z.string().optional(),
    scm: z.string().optional(),
    description: z.string().optional().nullable(),
    is_private: z.boolean().optional(),
    has_wiki: z.boolean().optional(),
    language: z.string().optional().nullable(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    workspace: ProviderWorkspaceSchema.optional().nullable(),
    project: ProviderProjectSchema.optional().nullable(),
    owner: ProviderOwnerSchema.optional().nullable(),
    links: z.record(z.string(), z.unknown()).optional().nullable()
});

const OutputSchema = z.object({
    uuid: z.string().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    full_name: z.string().optional(),
    scm: z.string().optional(),
    description: z.string().optional(),
    is_private: z.boolean().optional(),
    has_wiki: z.boolean().optional(),
    language: z.string().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    workspace_slug: z.string().optional(),
    project_key: z.string().optional(),
    owner_username: z.string().optional(),
    owner_uuid: z.string().optional()
});

const action = createAction({
    description: 'Create a repository in a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repository:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            scm: string;
            is_private?: boolean;
            description?: string;
            has_wiki?: boolean;
            language?: string;
            project?: { key: string };
        } = {
            scm: input.scm || 'git'
        };

        if (input.is_private !== undefined) {
            body.is_private = input.is_private;
        }

        if (input.description !== undefined) {
            body.description = input.description;
        }

        if (input.has_wiki !== undefined) {
            body.has_wiki = input.has_wiki;
        }

        if (input.language !== undefined) {
            body.language = input.language;
        }

        if (input.project_key !== undefined) {
            body.project = { key: input.project_key };
        }

        const response = await nango.post({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-repo-slug-post
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}`,
            data: body,
            retries: 3
        });

        const providerRepo = ProviderRepositorySchema.parse(response.data);

        const workspaceSlug = providerRepo.workspace?.slug;
        const projectKey = providerRepo.project?.key;
        const ownerUsername = providerRepo.owner?.username;
        const ownerUuid = providerRepo.owner?.uuid;

        return {
            ...(providerRepo.uuid !== undefined && { uuid: providerRepo.uuid }),
            ...(providerRepo.name !== undefined && { name: providerRepo.name }),
            ...(providerRepo.slug !== undefined && { slug: providerRepo.slug }),
            ...(providerRepo.full_name !== undefined && { full_name: providerRepo.full_name }),
            ...(providerRepo.scm !== undefined && { scm: providerRepo.scm }),
            ...(providerRepo.description != null && { description: providerRepo.description }),
            ...(providerRepo.is_private !== undefined && { is_private: providerRepo.is_private }),
            ...(providerRepo.has_wiki !== undefined && { has_wiki: providerRepo.has_wiki }),
            ...(providerRepo.language != null && { language: providerRepo.language }),
            ...(providerRepo.created_on !== undefined && { created_on: providerRepo.created_on }),
            ...(providerRepo.updated_on !== undefined && { updated_on: providerRepo.updated_on }),
            ...(workspaceSlug !== undefined && { workspace_slug: workspaceSlug }),
            ...(projectKey !== undefined && { project_key: projectKey }),
            ...(ownerUsername !== undefined && { owner_username: ownerUsername }),
            ...(ownerUuid !== undefined && { owner_uuid: ownerUuid })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
