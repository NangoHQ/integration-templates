import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace_id: z.string().describe('Globally unique identifier for the workspace or organization. Example: "12345"'),
    name: z.string().describe('Name of the tag. Example: "Stuff to buy"'),
    color: z
        .enum([
            'dark-pink',
            'dark-green',
            'dark-blue',
            'dark-red',
            'dark-teal',
            'dark-brown',
            'dark-orange',
            'dark-purple',
            'dark-warm-gray',
            'light-pink',
            'light-green',
            'light-blue',
            'light-red',
            'light-teal',
            'light-brown',
            'light-orange',
            'light-purple',
            'light-warm-gray'
        ])
        .optional()
        .describe('Color of the tag. Example: "light-green"')
});

const WorkspaceCompactSchema = z.object({
    gid: z.string(),
    name: z.string().optional()
});

const ProviderTagSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    color: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    workspace: WorkspaceCompactSchema.nullable().optional(),
    permalink_url: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    notes: z.string().optional(),
    created_at: z.string().optional(),
    workspace: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    permalink_url: z.string().optional()
});

const action = createAction({
    description: 'Create a tag in a workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-tag',
        group: 'Tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tagBody: { name: string; color?: string } = {
            name: input.name
        };
        if (input.color !== undefined) {
            tagBody.color = input.color;
        }

        const response = await nango.post({
            // https://developers.asana.com/reference/createtagforworkspace
            endpoint: `/api/1.0/workspaces/${input.workspace_id}/tags`,
            data: {
                data: tagBody
            },
            retries: 3
        });

        const providerTag = ProviderTagSchema.parse(response.data?.data);

        return {
            id: providerTag.gid,
            name: providerTag.name,
            ...(providerTag.color != null && { color: providerTag.color }),
            ...(providerTag.notes != null && { notes: providerTag.notes }),
            ...(providerTag.created_at != null && { created_at: providerTag.created_at }),
            ...(providerTag.workspace != null && {
                workspace: {
                    id: providerTag.workspace.gid,
                    ...(providerTag.workspace.name != null && { name: providerTag.workspace.name })
                }
            }),
            ...(providerTag.permalink_url != null && { permalink_url: providerTag.permalink_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
