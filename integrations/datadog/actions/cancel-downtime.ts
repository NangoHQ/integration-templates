import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    downtime_id: z.string().trim().min(1).describe('The ID of the downtime to cancel. Example: "12345"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Cancel a scheduled or active downtime.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://docs.datadoghq.com/api/latest/downtimes/#cancel-a-downtime
            endpoint: `v2/downtime/${encodeURIComponent(input.downtime_id)}`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
