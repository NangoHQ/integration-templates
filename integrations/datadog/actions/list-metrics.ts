import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from: z.number().describe('Start of the time window in seconds since the Unix epoch. Example: 1571011200')
});

const OutputSchema = z.object({
    from: z.string().optional().describe('Time when the metrics were active, seconds since the Unix epoch.'),
    metrics: z.array(z.string()).describe('List of active metric names.')
});

const action = createAction({
    description: 'List active metric names reporting in this account since a given time.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/metrics/
            endpoint: 'v1/metrics',
            params: {
                from: String(input.from)
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                from: z.union([z.string(), z.number()]).optional(),
                metrics: z.array(z.string()).optional()
            })
            .parse(response.data);

        return {
            ...(providerResponse.from != null && {
                from: String(providerResponse.from)
            }),
            metrics: providerResponse.metrics ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
