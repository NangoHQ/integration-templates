import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: topics/list
const InputSchema = z
    .object({ limit: z.number().int().min(1).max(100).optional(), after: z.string().optional(), before: z.string().optional() })
    .passthrough()
    .refine((input) => input.after === undefined || input.before === undefined, { message: 'Use either after or before, not both' });

const ProviderResponseSchema = z
    .object({
        object: z.string().optional(),
        has_more: z.boolean().optional(),
        data: z
            .array(
                z
                    .object({
                        id: z.string().optional(),
                        name: z.string().optional(),
                        description: z.string().optional(),
                        default_subscription: z.enum(['opt_in', 'opt_out']).optional(),
                        visibility: z.enum(['public', 'private']).optional(),
                        created_at: z.string().optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema.extend({ next_cursor: z.string().optional() });

const action = createAction({
    description: 'Retrieve a list of topics in Resend. Returns one page; pass next_cursor back as after, or as before when paginating backwards, to continue.',
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
            endpoint: `/topics`,
            retries: 3,
            params
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        const nextCursor = input['before'] !== undefined ? data.data?.[0]?.id : data.data?.at(-1)?.id;
        return { ...data, next_cursor: data.has_more ? nextCursor : undefined };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
