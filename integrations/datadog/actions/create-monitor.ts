import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the monitor. Example: "High CPU Usage"'),
    type: z.string().describe('Type of the monitor. Example: "metric alert", "query alert", "log alert"'),
    query: z.string().describe('The monitor query. Example: "avg(last_5m):avg:system.cpu.user{*} > 80"'),
    message: z.string().optional().describe('A message to include with notifications for this monitor'),
    tags: z.array(z.string()).optional().describe('A list of tags to associate with the monitor'),
    priority: z.number().int().optional().describe('The priority of the monitor (1-5)')
});

const ProviderMonitorSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    type: z.string(),
    query: z.string(),
    message: z.string().optional(),
    tags: z.array(z.string()).optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    priority: z.number().int().nullable().optional(),
    overall_state: z.string().optional(),
    created: z.string().optional(),
    modified: z.string().optional(),
    creator: z.record(z.string(), z.unknown()).optional(),
    restricted_roles: z.array(z.string()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    type: z.string(),
    query: z.string(),
    message: z.string().optional(),
    tags: z.array(z.string()).optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    priority: z.number().int().optional(),
    overall_state: z.string().optional(),
    created: z.string().optional(),
    modified: z.string().optional()
});

const action = createAction({
    description: 'Create a new monitor',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/monitors/#create-a-monitor
        const response = await nango.post({
            endpoint: 'v1/monitor',
            data: {
                name: input.name,
                type: input.type,
                query: input.query,
                ...(input.message !== undefined && { message: input.message }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.priority !== undefined && { priority: input.priority })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Monitor creation failed: empty response from Datadog API'
            });
        }

        const providerMonitor = ProviderMonitorSchema.parse(response.data);

        return {
            id: providerMonitor.id,
            name: providerMonitor.name,
            type: providerMonitor.type,
            query: providerMonitor.query,
            ...(providerMonitor.message !== undefined && { message: providerMonitor.message }),
            ...(providerMonitor.tags !== undefined && { tags: providerMonitor.tags }),
            ...(providerMonitor.options !== undefined && { options: providerMonitor.options }),
            ...(providerMonitor.priority != null && { priority: providerMonitor.priority }),
            ...(providerMonitor.overall_state !== undefined && { overall_state: providerMonitor.overall_state }),
            ...(providerMonitor.created !== undefined && { created: providerMonitor.created }),
            ...(providerMonitor.modified !== undefined && { modified: providerMonitor.modified })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
