import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderHostSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        host_name: z.string().optional(),
        aliases: z.array(z.string()).optional(),
        apps: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        up: z.boolean().optional(),
        metrics: z.record(z.string(), z.unknown()).optional(),
        meta: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    host_list: z.array(ProviderHostSchema).optional(),
    total_matching: z.number().optional(),
    total_returned: z.number().optional()
});

const OutputSchema = z.object({
    host_list: z.array(ProviderHostSchema),
    total_matching: z.number(),
    total_returned: z.number()
});

const action = createAction({
    description: 'List hosts reporting into this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/hosts/
            endpoint: 'v1/hosts',
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            host_list: parsed.host_list ?? [],
            total_matching: parsed.total_matching ?? 0,
            total_returned: parsed.total_returned ?? 0
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
