import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: broadcasts/list-clicked-links
const InputSchema = z
    .object({ id: z.string(), limit: z.number().int().min(1).max(100).optional(), after: z.string().optional(), before: z.string().optional() })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        object: z.string().optional(),
        has_more: z.boolean().optional(),
        data: z
            .array(
                z
                    .object({
                        id: z.string().optional(),
                        url: z.string().optional(),
                        clicks: z.number().int().optional(),
                        unique_clicks: z.number().int().optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema.extend({ next_cursor: z.string().optional() });

const action = createAction({
    description: "Retrieve a broadcast's clicked links in Resend. Returns one page; pass next_cursor as after to continue.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['limit'] !== undefined) params['limit'] = Array.isArray(input['limit']) ? input['limit'].join(',') : String(input['limit']);
        if (input['after'] !== undefined) params['after'] = Array.isArray(input['after']) ? input['after'].join(',') : String(input['after']);
        if (input['before'] !== undefined) params['before'] = Array.isArray(input['before']) ? input['before'].join(',') : String(input['before']);
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/broadcasts/${encodeURIComponent(input['id'])}/clicked-links`,
            retries: 3,
            params
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return { ...data, next_cursor: data.has_more ? data.data?.at(-1)?.id : undefined };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
