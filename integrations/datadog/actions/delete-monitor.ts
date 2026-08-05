import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    monitor_id: z.number().int().positive().describe('Monitor ID. Example: 12345')
});

const ProviderResponseSchema = z.object({
    deleted_monitor_id: z.number().int().positive()
});

const OutputSchema = z.object({
    deleted_monitor_id: z.number().int().positive()
});

const action = createAction({
    description: 'Delete a monitor.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['monitors_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.datadoghq.com/api/latest/monitors/#delete-a-monitor
            endpoint: `v1/monitor/${encodeURIComponent(input.monitor_id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            deleted_monitor_id: providerResponse.deleted_monitor_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
