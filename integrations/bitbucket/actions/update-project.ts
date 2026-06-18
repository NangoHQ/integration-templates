import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    project_key: z.string().describe('Existing project key. Example: "NANGO"'),
    name: z.string().optional().describe('New project name.'),
    description: z.string().nullable().optional().describe('New project description.'),
    is_private: z.boolean().nullable().optional().describe('Whether the project is private.'),
    key: z.string().optional().describe('New project key if renaming the project.'),
    avatar_href: z.string().optional().describe('Avatar image URL or data URI.')
});

const ProjectLinkSchema = z.object({
    href: z.string(),
    name: z.string().optional()
});

const ProviderProjectSchema = z.object({
    type: z.string().optional(),
    links: z
        .object({
            html: ProjectLinkSchema.optional(),
            avatar: ProjectLinkSchema.optional()
        })
        .optional(),
    uuid: z.string(),
    key: z.string(),
    owner: z
        .object({
            type: z.string().optional()
        })
        .optional(),
    name: z.string(),
    description: z.string().optional(),
    is_private: z.boolean().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    has_publicly_visible_repos: z.boolean().optional()
});

const OutputSchema = z.object({
    type: z.string().optional(),
    links: z
        .object({
            html: z
                .object({
                    href: z.string(),
                    name: z.string().optional()
                })
                .optional(),
            avatar: z
                .object({
                    href: z.string(),
                    name: z.string().optional()
                })
                .optional()
        })
        .optional(),
    uuid: z.string(),
    key: z.string(),
    owner: z
        .object({
            type: z.string().optional()
        })
        .optional(),
    name: z.string(),
    description: z.string().optional(),
    is_private: z.boolean().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    has_publicly_visible_repos: z.boolean().optional()
});

const action = createAction({
    description: 'Update a workspace project.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-project'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:admin'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.description !== undefined) {
            data['description'] = input.description;
        }
        if (input.is_private !== undefined) {
            data['is_private'] = input.is_private;
        }
        if (input.key !== undefined) {
            data['key'] = input.key;
        }
        if (input.avatar_href !== undefined) {
            data['links'] = {
                avatar: {
                    href: input.avatar_href
                }
            };
        }

        const response = await nango.put({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-projects/#api-workspaces-workspace-projects-project-key-put
            endpoint: `/2.0/workspaces/${encodeURIComponent(input.workspace)}/projects/${encodeURIComponent(input.project_key)}`,
            data,
            retries: 3
        });

        const providerProject = ProviderProjectSchema.parse(response.data);

        return {
            type: providerProject.type,
            ...(providerProject.links !== undefined && {
                links: {
                    ...(providerProject.links.html !== undefined && {
                        html: {
                            href: providerProject.links.html.href,
                            name: providerProject.links.html.name
                        }
                    }),
                    ...(providerProject.links.avatar !== undefined && {
                        avatar: {
                            href: providerProject.links.avatar.href,
                            name: providerProject.links.avatar.name
                        }
                    })
                }
            }),
            uuid: providerProject.uuid,
            key: providerProject.key,
            ...(providerProject.owner !== undefined && {
                owner: {
                    type: providerProject.owner.type
                }
            }),
            name: providerProject.name,
            ...(providerProject.description !== undefined && { description: providerProject.description }),
            ...(providerProject.is_private !== undefined && { is_private: providerProject.is_private }),
            ...(providerProject.created_on !== undefined && { created_on: providerProject.created_on }),
            ...(providerProject.updated_on !== undefined && { updated_on: providerProject.updated_on }),
            ...(providerProject.has_publicly_visible_repos !== undefined && {
                has_publicly_visible_repos: providerProject.has_publicly_visible_repos
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
