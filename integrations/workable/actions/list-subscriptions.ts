import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (full URL) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results per page. Max 100.')
});

const SubscriptionSchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        event: z.string().nullable().optional(),
        target: z.string().url(),
        state: z.string().nullable().optional(),
        created_at: z.string(),
        valid_until: z.string().nullable().optional(),
        stage_slug: z.string().nullable().optional(),
        job_shortcode: z.string().nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    subscriptions: z.array(SubscriptionSchema),
    paging: z
        .object({
            next: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(SubscriptionSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List active webhook subscriptions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_candidates', 'r_employees'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint = '/spi/v3/subscriptions';
        const params: Record<string, string | number> = {};

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        if (input.cursor) {
            const cursorUrl = new URL(input.cursor);
            endpoint = cursorUrl.pathname;
            for (const [key, value] of cursorUrl.searchParams.entries()) {
                params[key] = value;
            }
        }

        let response: { data: unknown; status: number };
        // @allowTryCatch Workable returns 404 when no subscriptions exist.
        try {
            const res = await nango.get({
                // https://workable.readme.io/reference/subscriptions
                endpoint,
                params,
                retries: 3
            });
            response = res;
        } catch (err) {
            if (
                err &&
                typeof err === 'object' &&
                'response' in err &&
                err.response &&
                typeof err.response === 'object' &&
                'status' in err.response &&
                err.response.status === 404
            ) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No webhook subscriptions found.'
                });
            }
            throw err;
        }

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No webhook subscriptions found.'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.subscriptions,
            ...(providerResponse.paging?.next != null && { next_cursor: providerResponse.paging.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
