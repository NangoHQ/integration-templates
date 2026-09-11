import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: domains/list
const InputSchema = z
    .object({ limit: z.number().int().min(1).max(100).optional(), after: z.string().optional(), before: z.string().optional() })
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
                        status: z.enum(['pending', 'verified', 'failed', 'not_started', 'partially_verified', 'partially_failed']).optional(),
                        created_at: z.string().optional(),
                        region: z.string().optional(),
                        open_tracking: z.boolean().optional(),
                        click_tracking: z.boolean().optional(),
                        capabilities: z
                            .object({ sending: z.enum(['enabled', 'disabled']).optional(), receiving: z.enum(['enabled', 'disabled']).optional() })
                            .passthrough()
                            .optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema.extend({ next_cursor: z.string().optional() });

const action = createAction({
    description: 'List domains in Resend. Returns one page; pass next_cursor as after to continue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input['limit'] !== undefined) params['limit'] = input['limit'];
        if (input['after'] !== undefined) params['after'] = input['after'];
        if (input['before'] !== undefined) params['before'] = input['before'];
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/domains`,
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
