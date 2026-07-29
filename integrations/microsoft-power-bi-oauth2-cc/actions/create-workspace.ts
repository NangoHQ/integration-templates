import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('Name of the new workspace. Example: "Nango Test Workspace"')
});

const ProviderWorkspaceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    isReadOnly: z.boolean().optional(),
    isOnDedicatedCapacity: z.boolean().optional(),
    capacityId: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    isReadOnly: z.boolean().optional(),
    isOnDedicatedCapacity: z.boolean().optional(),
    capacityId: z.string().optional()
});

const action = createAction({
    description: 'Create a new Power BI workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/en-us/rest/api/power-bi/groups/create-group
            endpoint: '/v1.0/myorg/groups',
            params: {
                workspaceV2: 'True'
            },
            data: {
                name: input.name
            },
            retries: 1
        });

        const workspace = ProviderWorkspaceSchema.parse(response.data);

        return {
            id: workspace.id,
            ...(workspace.name !== undefined && { name: workspace.name }),
            ...(workspace.isReadOnly !== undefined && { isReadOnly: workspace.isReadOnly }),
            ...(workspace.isOnDedicatedCapacity !== undefined && { isOnDedicatedCapacity: workspace.isOnDedicatedCapacity }),
            ...(workspace.capacityId != null && { capacityId: workspace.capacityId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
