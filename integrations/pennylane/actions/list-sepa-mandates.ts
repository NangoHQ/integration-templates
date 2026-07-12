import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.')
});

const SepaMandateSchema = z.object({
    id: z.number(),
    bank: z.string().nullable(),
    bic: z.string(),
    iban: z.string(),
    sequence_type: z.string(),
    signed_at: z.string(),
    identifier: z.string(),
    customer: z.object({
        id: z.number(),
        url: z.string()
    }),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(SepaMandateSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const ListResponseSchema = z.object({
    items: z.array(z.unknown()),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List SEPA mandates.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_mandates:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getsepamandates
            endpoint: '/api/external/v2/sepa_mandates',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsedResponse = ListResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from provider.'
            });
        }

        const rawData = parsedResponse.data;

        const items = rawData.items.map((item) => {
            const parsedItem = SepaMandateSchema.safeParse(item);
            if (!parsedItem.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid SEPA mandate item in provider response.'
                });
            }
            return parsedItem.data;
        });

        return {
            items,
            ...(rawData.next_cursor != null && { next_cursor: rawData.next_cursor }),
            has_more: rawData.has_more
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
