import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Schedules V2#ListOverrides
const InputSchema = z
    .object({
        schedule_id: z.string(),
        rotation_id: z.string().optional(),
        layer_id: z.string().optional(),
        page_size: z.number().int().min(1).max(250).optional(),
        after: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        overrides: z.array(
            z
                .object({
                    created_at: z.string(),
                    end_at: z.string(),
                    id: z.string(),
                    layer_id: z.string(),
                    rotation_id: z.string(),
                    schedule_id: z.string(),
                    start_at: z.string(),
                    updated_at: z.string(),
                    user: z
                        .object({
                            email: z.string().optional(),
                            id: z.string(),
                            name: z.string(),
                            role: z.enum(['viewer', 'responder', 'administrator', 'owner', 'unset']),
                            slack_user_id: z.string().optional()
                        })
                        .passthrough()
                        .optional()
                })
                .passthrough()
        ),
        pagination_meta: z
            .object({ after: z.string().optional(), page_size: z.number().int().max(250) })
            .passthrough()
            .optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema.extend({ next_cursor: z.string().optional() });

const action = createAction({
    description: 'List schedule overrides in incident.io. Returns one page; pass next_cursor as after to continue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['schedule_id'] !== undefined)
            params['schedule_id'] = Array.isArray(input['schedule_id']) ? input['schedule_id'].join(',') : String(input['schedule_id']);
        if (input['rotation_id'] !== undefined)
            params['rotation_id'] = Array.isArray(input['rotation_id']) ? input['rotation_id'].join(',') : String(input['rotation_id']);
        if (input['layer_id'] !== undefined) params['layer_id'] = Array.isArray(input['layer_id']) ? input['layer_id'].join(',') : String(input['layer_id']);
        if (input['page_size'] !== undefined)
            params['page_size'] = Array.isArray(input['page_size']) ? input['page_size'].join(',') : String(input['page_size']);
        if (input['after'] !== undefined) params['after'] = Array.isArray(input['after']) ? input['after'].join(',') : String(input['after']);
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/schedule_overrides`,
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
