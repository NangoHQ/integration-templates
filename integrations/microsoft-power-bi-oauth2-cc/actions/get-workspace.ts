import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspaceId: z.string().describe('The workspace (group) ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    isReadOnly: z.boolean().optional(),
    isOnDedicatedCapacity: z.boolean().optional(),
    capacityId: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    type: z.string().optional()
});

const action = createAction({
    description: 'Get details of a single workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/power-bi/groups/get-group
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.workspaceId)}`,
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Power BI API'
            });
        }

        const providerWorkspace = z
            .object({
                id: z.string(),
                name: z.string(),
                isReadOnly: z.boolean().optional(),
                isOnDedicatedCapacity: z.boolean().optional(),
                capacityId: z.string().nullable().optional(),
                description: z.string().nullable().optional(),
                type: z.string().optional()
            })
            .parse(raw);

        return {
            id: providerWorkspace.id,
            name: providerWorkspace.name,
            ...(providerWorkspace.isReadOnly !== undefined && { isReadOnly: providerWorkspace.isReadOnly }),
            ...(providerWorkspace.isOnDedicatedCapacity !== undefined && { isOnDedicatedCapacity: providerWorkspace.isOnDedicatedCapacity }),
            ...(providerWorkspace.capacityId != null && { capacityId: providerWorkspace.capacityId }),
            ...(providerWorkspace.description != null && { description: providerWorkspace.description }),
            ...(providerWorkspace.type !== undefined && { type: providerWorkspace.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
