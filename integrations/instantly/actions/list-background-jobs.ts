import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().optional().describe('Number of results to return per page. Maximum 100.'),
    starting_after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const BackgroundJobSchema = z.object({
    id: z.string(),
    workspace_id: z.string(),
    user_id: z.string().optional(),
    type: z.string(),
    entity_id: z.string().optional(),
    entity_type: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    progress: z.number().optional(),
    status: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(BackgroundJobSchema),
    next_starting_after: z.string().optional()
});

const action = createAction({
    description: 'List background jobs.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-background-jobs'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['background-jobs:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/backgroundjob/list-background-job
            endpoint: '/v2/background-jobs',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.starting_after !== undefined && { starting_after: input.starting_after })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                items: z.array(z.unknown()).optional().default([]),
                next_starting_after: z.string().nullish()
            })
            .parse(response.data);

        const items = providerResponse.items.map((item) => {
            const parsed = BackgroundJobSchema.safeParse(item);
            if (parsed.success) {
                return parsed.data;
            }

            const fallback = z.record(z.string(), z.unknown()).safeParse(item);
            if (fallback.success) {
                return {
                    id: typeof fallback.data['id'] === 'string' ? fallback.data['id'] : 'unknown',
                    workspace_id: typeof fallback.data['workspace_id'] === 'string' ? fallback.data['workspace_id'] : 'unknown',
                    type: typeof fallback.data['type'] === 'string' ? fallback.data['type'] : 'unknown',
                    status: typeof fallback.data['status'] === 'string' ? fallback.data['status'] : 'unknown'
                };
            }

            return {
                id: 'unknown',
                workspace_id: 'unknown',
                type: 'unknown',
                status: 'unknown'
            };
        });

        return {
            items,
            ...(providerResponse.next_starting_after != null && {
                next_starting_after: providerResponse.next_starting_after
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
