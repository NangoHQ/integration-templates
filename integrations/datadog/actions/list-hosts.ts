import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(1000).optional().describe('Maximum number of hosts to return per page. Defaults to 100.')
});

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
    total_returned: z.number(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List hosts reporting into this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer offset'
            });
        }
        const start = input.cursor ? parseInt(input.cursor, 10) : 0;
        const count = input.page_size ?? 100;

        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/hosts/
            endpoint: 'v1/hosts',
            params: {
                start: String(start),
                count: String(count)
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const hostList = parsed.host_list ?? [];
        const totalMatching = parsed.total_matching ?? 0;
        const nextCursor = start + hostList.length < totalMatching ? String(start + hostList.length) : undefined;

        return {
            host_list: hostList,
            total_matching: totalMatching,
            total_returned: parsed.total_returned ?? 0,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
