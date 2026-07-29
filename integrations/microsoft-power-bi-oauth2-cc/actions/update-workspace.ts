import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspaceId: z.string().describe('The workspace (group) ID to update. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    name: z.string().describe('The new name for the workspace.')
});

const ProviderWorkspaceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    isReadOnly: z.boolean().optional(),
    isOnDedicatedCapacity: z.boolean().optional(),
    capacityId: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    isReadOnly: z.boolean().optional(),
    isOnDedicatedCapacity: z.boolean().optional(),
    capacityId: z.string().optional()
});

const action = createAction({
    description: 'Rename a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/rest/api/power-bi/groups/update-group
        await nango.patch({
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.workspaceId)}`,
            data: {
                name: input.name
            },
            retries: 3
        });

        // https://learn.microsoft.com/en-us/rest/api/power-bi/groups/get-group
        const response = await nango.get({
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.workspaceId)}`,
            retries: 3
        });

        const workspace = ProviderWorkspaceSchema.parse(response.data);

        return {
            id: workspace.id,
            ...(workspace.name !== undefined && { name: workspace.name }),
            ...(workspace.isReadOnly !== undefined && { isReadOnly: workspace.isReadOnly }),
            ...(workspace.isOnDedicatedCapacity !== undefined && { isOnDedicatedCapacity: workspace.isOnDedicatedCapacity }),
            ...(workspace.capacityId !== undefined && { capacityId: workspace.capacityId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
