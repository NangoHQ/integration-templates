import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    monitor_id: z.number().describe('The ID of the monitor. Example: 308771182')
});

const CreatorSchema = z.object({
    name: z.string(),
    email: z.string(),
    handle: z.string(),
    id: z.number()
});

const MonitorSchema = z
    .object({
        id: z.number(),
        org_id: z.number(),
        type: z.string(),
        name: z.string(),
        message: z.string(),
        tags: z.array(z.string()),
        query: z.string(),
        options: z.record(z.string(), z.unknown()),
        multi: z.boolean(),
        created_at: z.number(),
        created: z.string(),
        modified: z.string(),
        deleted: z.unknown().nullable(),
        priority: z.unknown().nullable(),
        restricted_roles: z.unknown().nullable(),
        draft_status: z.string().nullable().optional(),
        overall_state_modified: z.string().nullable().optional(),
        overall_state: z.string().nullable().optional(),
        creator: CreatorSchema.nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get a single monitor by id',
    version: '1.0.0',
    input: InputSchema,
    output: MonitorSchema,
    scopes: ['monitors_read'],

    exec: async (nango, input): Promise<z.infer<typeof MonitorSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/monitors/#get-a-monitor-s-details
            endpoint: `v1/monitor/${encodeURIComponent(String(input.monitor_id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Monitor not found',
                monitor_id: input.monitor_id
            });
        }

        const monitor = MonitorSchema.parse(response.data);

        return monitor;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
