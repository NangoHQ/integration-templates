import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    monitor_id: z.number().describe('The ID of the monitor to update. Example: 12345'),
    name: z.string().optional().describe('The new name for the monitor.'),
    query: z.string().optional().describe('The new query for the monitor.'),
    message: z.string().optional().describe('The new message for the monitor.'),
    options: z.record(z.string(), z.unknown()).optional().describe('The new options for the monitor.')
});

const ProviderMonitorSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    query: z.string(),
    message: z.string().optional(),
    tags: z.array(z.string()).optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    multi: z.boolean().optional(),
    created_at: z.number().optional(),
    modified_at: z.number().optional(),
    overall_state: z.string().optional(),
    priority: z.number().nullable().optional()
});

const OutputSchema = ProviderMonitorSchema;

const action = createAction({
    description: "Update a monitor's name, query, message, or options.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['monitors_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.query !== undefined) {
            data['query'] = input.query;
        }
        if (input.message !== undefined) {
            data['message'] = input.message;
        }
        if (input.options !== undefined) {
            data['options'] = input.options;
        }

        const response = await nango.put({
            // https://docs.datadoghq.com/api/latest/monitors/#edit-a-monitor
            endpoint: `v1/monitor/${encodeURIComponent(String(input.monitor_id))}`,
            data,
            retries: 3
        });

        const monitor = ProviderMonitorSchema.parse(response.data);
        return monitor;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
