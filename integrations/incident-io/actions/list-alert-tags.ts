import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Alerts V2#ListAlertTags
const InputSchema = z
    .object({ page_size: z.number().int().min(1).max(250).optional(), after: z.string().optional(), search: z.string().optional() })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        alert_tags: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
        pagination_meta: z.object({ after: z.string().optional(), page_size: z.number().int().max(250) }).passthrough()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema.extend({ next_cursor: z.string().optional() });

const action = createAction({
    description: 'List alert tags in incident.io. Returns one page; pass next_cursor as after to continue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['page_size'] !== undefined)
            params['page_size'] = Array.isArray(input['page_size']) ? input['page_size'].join(',') : String(input['page_size']);
        if (input['after'] !== undefined) params['after'] = Array.isArray(input['after']) ? input['after'].join(',') : String(input['after']);
        if (input['search'] !== undefined) params['search'] = Array.isArray(input['search']) ? input['search'].join(',') : String(input['search']);
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/alert_tags`,
            retries: 3,
            params
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return { ...data, next_cursor: data.pagination_meta?.after || undefined };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
