import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const PAGE_SIZE = 100;

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
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/power-bi/groups/get-groups
            endpoint: '/v1.0/myorg/groups',
            params: {
                $top: PAGE_SIZE
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                limit_name_in_request: '$top',
                limit: PAGE_SIZE,
                response_path: 'value'
            },
            retries: 3
        };

        const workspaces: z.infer<typeof OutputSchema>['workspaces'] = [];

        for await (const page of nango.paginate(config)) {
            for (const item of page) {
                const ws = WorkspaceSchema.parse(item);
                workspaces.push({
                    id: ws.id,
                    name: ws.name,
                    ...(ws.isReadOnly !== undefined && { isReadOnly: ws.isReadOnly }),
                    ...(ws.isOnDedicatedCapacity !== undefined && { isOnDedicatedCapacity: ws.isOnDedicatedCapacity }),
                    ...(ws.capacityId != null && { capacityId: ws.capacityId }),
                    ...(ws.description != null && { description: ws.description }),
                    ...(ws.type != null && { type: ws.type })
                });
            }
        }

        return {
            workspaces
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
