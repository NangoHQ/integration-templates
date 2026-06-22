import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    key: z.string().max(10).describe('Project key in uppercase. Example: "PROJ"'),
    name: z.string().describe('Project name. Example: "My Project"'),
    description: z.string().optional().describe('Optional project description.'),
    is_private: z.boolean().optional().describe('Whether the project is private.')
});

const LinkSchema = z.object({
    href: z.string().optional(),
    name: z.string().optional()
});

const LinksSchema = z.object({
    html: LinkSchema.optional(),
    avatar: LinkSchema.optional()
});

const OwnerSchema = z
    .object({
        type: z.string().optional()
    })
    .passthrough();

const ProviderProjectSchema = z.object({
    type: z.string().optional(),
    links: LinksSchema.optional(),
    uuid: z.string().optional(),
    key: z.string().optional(),
    owner: OwnerSchema.optional(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    is_private: z.boolean().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    has_publicly_visible_repos: z.boolean().optional()
});

const OutputSchema = z.object({
    type: z.string().optional(),
    links: LinksSchema.optional(),
    uuid: z.string().optional(),
    key: z.string().optional(),
    owner: OwnerSchema.optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    is_private: z.boolean().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    has_publicly_visible_repos: z.boolean().optional()
});

const action = createAction({
    description: 'Create a project in a workspace',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-projects/#api-workspaces-workspace-projects-post
            endpoint: `/2.0/workspaces/${encodeURIComponent(input.workspace)}/projects`,
            data: {
                key: input.key,
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.is_private !== undefined && { is_private: input.is_private })
            },
            retries: 3
        });

        const project = ProviderProjectSchema.parse(response.data);

        return {
            ...(project.type != null && { type: project.type }),
            ...(project.links != null && { links: project.links }),
            ...(project.uuid != null && { uuid: project.uuid }),
            ...(project.key != null && { key: project.key }),
            ...(project.owner != null && { owner: project.owner }),
            ...(project.name != null && { name: project.name }),
            ...(project.description != null && { description: project.description }),
            ...(project.is_private != null && { is_private: project.is_private }),
            ...(project.created_on != null && { created_on: project.created_on }),
            ...(project.updated_on != null && { updated_on: project.updated_on }),
            ...(project.has_publicly_visible_repos != null && { has_publicly_visible_repos: project.has_publicly_visible_repos })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
