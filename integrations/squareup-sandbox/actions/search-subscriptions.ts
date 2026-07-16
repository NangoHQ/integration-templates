import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('The maximum number of subscriptions to return in a paged response. Min: 1.'),
    location_ids: z.array(z.string()).optional().describe('Filter by location IDs.'),
    customer_ids: z.array(z.string()).optional().describe('Filter by customer IDs.'),
    source_names: z.array(z.string()).optional().describe('Filter by source names.'),
    include: z.array(z.string()).optional().describe('Related information to include in the response, e.g. "actions".')
});

const ProviderResponseSchema = z.object({
    subscriptions: z.array(z.object({ id: z.string() }).passthrough()).optional(),
    cursor: z.string().optional(),
    errors: z
        .array(
            z.object({
                category: z.string().optional(),
                code: z.string().optional(),
                detail: z.string().optional(),
                field: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    subscriptions: z.array(z.object({ id: z.string() }).passthrough()),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'Search subscriptions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SUBSCRIPTIONS_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            ...(input.cursor !== undefined && { cursor: input.cursor }),
            ...(input.limit !== undefined && { limit: input.limit }),
            ...(input.include !== undefined && { include: input.include })
        };

        const filter: Record<string, unknown> = {};
        if (input.location_ids !== undefined && input.location_ids.length > 0) {
            filter['location_ids'] = input.location_ids;
        }
        if (input.customer_ids !== undefined && input.customer_ids.length > 0) {
            filter['customer_ids'] = input.customer_ids;
        }
        if (input.source_names !== undefined && input.source_names.length > 0) {
            filter['source_names'] = input.source_names;
        }

        if (Object.keys(filter).length > 0) {
            body['query'] = { filter };
        }

        // https://developer.squareup.com/reference/square/subscriptions-api/search-subscriptions
        const response = await nango.post({
            endpoint: '/v2/subscriptions/search',
            data: body,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            const firstError = parsed.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: firstError.detail ?? firstError.code ?? 'Square API returned an error',
                    errors: parsed.errors
                });
            }
        }

        return {
            subscriptions: parsed.subscriptions ?? [],
            ...(parsed.cursor !== undefined && { next_cursor: parsed.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
