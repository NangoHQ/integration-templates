import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const WorkspaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    isReadOnly: z.boolean().optional(),
    isOnDedicatedCapacity: z.boolean().optional(),
    capacityId: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    type: z.string().optional().nullable()
});

const OutputSchema = z.object({
    workspaces: z.array(WorkspaceSchema)
});

const action = createAction({
    description: 'List Power BI workspaces (groups) accessible to this service principal.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/power-bi/groups/get-groups
            endpoint: '/v1.0/myorg/groups',
            retries: 3
        });

        const data = z
            .object({
                value: z.array(z.unknown())
            })
            .parse(response.data);

        const workspaces = data.value.map((item: unknown) => {
            const ws = WorkspaceSchema.parse(item);
            return {
                id: ws.id,
                name: ws.name,
                ...(ws.isReadOnly !== undefined && { isReadOnly: ws.isReadOnly }),
                ...(ws.isOnDedicatedCapacity !== undefined && { isOnDedicatedCapacity: ws.isOnDedicatedCapacity }),
                ...(ws.capacityId != null && { capacityId: ws.capacityId }),
                ...(ws.description != null && { description: ws.description }),
                ...(ws.type != null && { type: ws.type })
            };
        });

        return {
            workspaces
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
