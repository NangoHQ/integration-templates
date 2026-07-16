import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string(),
    contact_count: z.number().optional(),
    _metadata: z
        .object({
            self: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    result: z.array(ProviderListSchema),
    _metadata: z.object({
        next: z.string().optional(),
        prev: z.string().optional(),
        self: z.string().optional(),
        count: z.number().optional()
    })
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            contact_count: z.number().optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List contact lists.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['mail.send', 'marketing.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.twilio.com/docs/sendgrid/api-reference/lists/get-all-lists
        const response = await nango.get({
            endpoint: '/v3/marketing/lists',
            params: {
                page_size: '100',
                ...(input.cursor && { page_token: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        if (providerResponse._metadata.next !== undefined) {
            const nextUrl = new URL(providerResponse._metadata.next);
            nextCursor = nextUrl.searchParams.get('page_token') ?? undefined;
        }

        return {
            items: providerResponse.result.map((list) => ({
                id: list.id,
                name: list.name,
                ...(list.contact_count !== undefined && { contact_count: list.contact_count })
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
