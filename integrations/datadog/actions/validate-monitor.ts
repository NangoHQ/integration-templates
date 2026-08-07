import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    type: z.string().describe('Monitor type. Example: "metric alert"'),
    query: z.string().describe('Monitor query. Example: "avg(last_5m):sum:system.net.bytes_rcvd{host:host0} > 100"')
});

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Validate a monitor definition (type + query) without creating it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/monitors/#validate-a-monitor
            endpoint: 'v1/monitor/validate',
            data: {
                type: input.type,
                query: input.query
            },
            retries: 3
        });

        const output = OutputSchema.parse(response.data);
        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
