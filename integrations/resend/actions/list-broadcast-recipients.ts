import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: broadcasts/recipients
const InputSchema = z
    .object({
        id: z.string(),
        type: z.enum(['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed', 'suppressed']),
        email: z.string().optional(),
        bounce_type: z.enum(['permanent', 'transient', 'undetermined']).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        after: z.string().optional(),
        before: z.string().optional()
    })
    .passthrough()
    .refine((input) => input.after === undefined || input.before === undefined, { message: 'Use either after or before, not both' })
    .refine((input) => input.bounce_type === undefined || input.type === 'bounced', {
        message: 'bounce_type is only valid when type is bounced',
        path: ['bounce_type']
    });

const ProviderResponseSchema = z
    .object({
        object: z.string().optional(),
        has_more: z.boolean().optional(),
        data: z
            .array(
                z
                    .object({
                        id: z.string().optional(),
                        contact_id: z.string().nullable().optional(),
                        email: z.string().optional(),
                        count: z.number().int().optional(),
                        bounce_type: z.enum(['permanent', 'transient', 'undetermined']).optional(),
                        clicked_links: z.array(z.object({ url: z.string().optional(), clicks: z.number().int().optional() }).passthrough()).optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema.extend({ next_cursor: z.string().optional() });

const action = createAction({
    description:
        'Retrieve broadcast recipients in Resend. Returns one page; pass next_cursor back as after, or as before when paginating backwards, to continue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['type'] !== undefined) params['type'] = Array.isArray(input['type']) ? input['type'].join(',') : String(input['type']);
        if (input['email'] !== undefined) params['email'] = Array.isArray(input['email']) ? input['email'].join(',') : String(input['email']);
        if (input['bounce_type'] !== undefined)
            params['bounce_type'] = Array.isArray(input['bounce_type']) ? input['bounce_type'].join(',') : String(input['bounce_type']);
        if (input['limit'] !== undefined) params['limit'] = Array.isArray(input['limit']) ? input['limit'].join(',') : String(input['limit']);
        if (input['after'] !== undefined) params['after'] = Array.isArray(input['after']) ? input['after'].join(',') : String(input['after']);
        if (input['before'] !== undefined) params['before'] = Array.isArray(input['before']) ? input['before'].join(',') : String(input['before']);
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/broadcasts/${encodeURIComponent(input['id'])}/recipients`,
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
