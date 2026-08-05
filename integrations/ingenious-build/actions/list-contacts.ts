import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number. Example: 1'),
    per_page: z.number().optional().describe('Number of items per page. Example: 20')
});

const ProviderContactSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const ProviderListEnvelopeSchema = z.object({
    items: z.array(z.unknown()),
    total: z.number(),
    page: z.number(),
    per_page: z.number(),
    first_page_url: z.string().nullable().optional(),
    last_page_url: z.string().nullable().optional(),
    next_page_url: z.string().nullable().optional(),
    prev_page_url: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderContactSchema),
    total: z.number(),
    page: z.number(),
    per_page: z.number(),
    first_page_url: z.string().optional(),
    last_page_url: z.string().optional(),
    next_page_url: z.string().optional(),
    prev_page_url: z.string().optional()
});

const action = createAction({
    description: 'List contacts in this workspace',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://api.ingenious.build/reference/importcontactpubv2
            endpoint: '/api/v2/pub/contacts',
            params: {
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        });

        const envelope = ProviderListEnvelopeSchema.parse(response.data);

        return {
            items: envelope.items.map((item) => ProviderContactSchema.parse(item)),
            total: envelope.total,
            page: envelope.page,
            per_page: envelope.per_page,
            ...(envelope.first_page_url != null && { first_page_url: envelope.first_page_url }),
            ...(envelope.last_page_url != null && { last_page_url: envelope.last_page_url }),
            ...(envelope.next_page_url != null && { next_page_url: envelope.next_page_url }),
            ...(envelope.prev_page_url != null && { prev_page_url: envelope.prev_page_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
