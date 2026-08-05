import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    monitor_id: z.number().describe('The ID of the monitor to unmute. Example: 310792870')
});

const ProviderSilencedSchema = z.record(z.string(), z.number().nullable());

const ProviderMonitorSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    query: z.string(),
    message: z.string().optional(),
    tags: z.array(z.string()).optional(),
    options: z
        .object({
            silenced: ProviderSilencedSchema.optional()
        })
        .optional(),
    overall_state: z.string().optional(),
    created_at: z.number().optional(),
    modified_at: z.number().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    query: z.string(),
    message: z.string().optional(),
    tags: z.array(z.string()).optional(),
    options: z
        .object({
            silenced: ProviderSilencedSchema.optional()
        })
        .optional(),
    overall_state: z.string().optional(),
    created_at: z.number().optional(),
    modified_at: z.number().optional()
});

const action = createAction({
    description: 'Unmute a previously muted monitor.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/monitors/#unmute-a-monitor
            endpoint: `v1/monitor/${encodeURIComponent(String(input.monitor_id))}/unmute`,
            retries: 3
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Monitor not found or unmute failed',
                monitor_id: input.monitor_id
            });
        }

        const monitor = ProviderMonitorSchema.parse(response.data);

        return {
            id: monitor.id,
            name: monitor.name,
            type: monitor.type,
            query: monitor.query,
            ...(monitor.message !== undefined && { message: monitor.message }),
            ...(monitor.tags !== undefined && { tags: monitor.tags }),
            ...(monitor.options !== undefined && {
                options: {
                    ...(monitor.options.silenced !== undefined && { silenced: monitor.options.silenced })
                }
            }),
            ...(monitor.overall_state !== undefined && { overall_state: monitor.overall_state }),
            ...(monitor.created_at !== undefined && { created_at: monitor.created_at }),
            ...(monitor.modified_at !== undefined && { modified_at: monitor.modified_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
