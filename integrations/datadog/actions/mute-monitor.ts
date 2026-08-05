import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    monitor_id: z.number().describe('The ID of the monitor to mute. Example: 310560464'),
    scope: z.string().optional().describe('The scope to apply the mute to, e.g. "host:myhost". If omitted, the entire monitor is muted.'),
    end: z.number().optional().describe('A POSIX timestamp for when the mute expires. Omit for an indefinite mute.')
});

const MonitorSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        type: z.string().optional(),
        query: z.string().optional(),
        options: z
            .object({
                silenced: z.record(z.string(), z.unknown()).optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    type: z.string().optional(),
    query: z.string().optional(),
    silenced: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: "Mute (silence) a monitor's notifications.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['monitors_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/monitors/#mute-a-monitor
            endpoint: `v1/monitor/${encodeURIComponent(String(input.monitor_id))}/mute`,
            params: {
                ...(input.scope !== undefined && { scope: input.scope }),
                ...(input.end !== undefined && { end: String(input.end) })
            },
            retries: 10
        });

        const monitor = MonitorSchema.parse(response.data);

        return {
            id: monitor.id,
            ...(monitor.name !== undefined && { name: monitor.name }),
            ...(monitor.type !== undefined && { type: monitor.type }),
            ...(monitor.query !== undefined && { query: monitor.query }),
            ...(monitor.options?.silenced !== undefined && { silenced: monitor.options.silenced })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
