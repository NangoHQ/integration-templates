import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: contacts/list-imports
const InputSchema = z
    .object({
        status: z.enum(['queued', 'in_progress', 'completed', 'failed']).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        after: z.string().optional(),
        before: z.string().optional()
    })
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
                        object: z.string().optional(),
                        id: z.string().optional(),
                        status: z.enum(['queued', 'in_progress', 'completed', 'failed']).optional(),
                        created_at: z.string().optional(),
                        completed_at: z.string().nullable().optional(),
                        counts: z
                            .object({
                                total: z.number().int().optional(),
                                created: z.number().int().optional(),
                                updated: z.number().int().optional(),
                                skipped: z.number().int().optional(),
                                failed: z.number().int().optional()
                            })
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
    description:
        'Retrieve a list of contact imports in Resend. Returns one page; pass next_cursor back as after, or as before when paginating backwards, to continue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['status'] !== undefined) params['status'] = Array.isArray(input['status']) ? input['status'].join(',') : String(input['status']);
        if (input['limit'] !== undefined) params['limit'] = Array.isArray(input['limit']) ? input['limit'].join(',') : String(input['limit']);
        if (input['after'] !== undefined) params['after'] = Array.isArray(input['after']) ? input['after'].join(',') : String(input['after']);
        if (input['before'] !== undefined) params['before'] = Array.isArray(input['before']) ? input['before'].join(',') : String(input['before']);
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/contacts/imports`,
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
