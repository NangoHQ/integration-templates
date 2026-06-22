import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug or UUID. Example: "nangodev"')
});

const ProviderWorkspaceSchema = z.object({
    type: z.string(),
    uuid: z.string(),
    name: z.string().optional(),
    slug: z.string(),
    is_private: z.boolean(),
    is_privacy_enforced: z.boolean().optional(),
    forking_mode: z.string().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    links: z.object({}).passthrough().optional()
});

const OutputSchema = z.object({
    type: z.string(),
    uuid: z.string(),
    name: z.string().optional(),
    slug: z.string(),
    is_private: z.boolean(),
    is_privacy_enforced: z.boolean().optional(),
    forking_mode: z.string().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    links: z.object({}).passthrough().optional()
});

const action = createAction({
    description: 'Retrieve a Bitbucket workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-workspaces-workspace-get
            endpoint: `/2.0/workspaces/${encodeURIComponent(input.workspace)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Workspace not found',
                workspace: input.workspace
            });
        }

        const workspace = ProviderWorkspaceSchema.parse(response.data);

        return {
            type: workspace.type,
            uuid: workspace.uuid,
            slug: workspace.slug,
            is_private: workspace.is_private,
            ...(workspace.name !== undefined && { name: workspace.name }),
            ...(workspace.is_privacy_enforced !== undefined && { is_privacy_enforced: workspace.is_privacy_enforced }),
            ...(workspace.forking_mode !== undefined && { forking_mode: workspace.forking_mode }),
            ...(workspace.created_on !== undefined && { created_on: workspace.created_on }),
            ...(workspace.updated_on !== undefined && { updated_on: workspace.updated_on }),
            ...(workspace.links !== undefined && { links: workspace.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
