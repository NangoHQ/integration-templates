import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderContactSchema = z
    .object({
        id: z.string(),
        firstName: z.string().optional().nullable(),
        lastName: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        mobile: z.string().optional().nullable(),
        accountId: z.string().optional().nullable(),
        createdTime: z.string().optional().nullable(),
        modifiedTime: z.string().optional().nullable()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    data: z.array(z.unknown())
});

const OutputSchema = z.object({
    items: z.array(ProviderContactSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List contacts',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Desk.contacts.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            limit: 50
        };

        const parsedFrom = input.cursor ? parseInt(input.cursor, 10) : 1;
        const currentFrom = !isNaN(parsedFrom) && parsedFrom > 1 ? parsedFrom : 1;
        if (currentFrom > 1) {
            params['from'] = currentFrom;
        }

        // https://desk.zoho.com/DeskAPIDocument
        const response = await nango.get({
            endpoint: '/v1/contacts',
            params,
            retries: 3
        });

        if (!response.data || response.status === 204) {
            return {
                items: []
            };
        }

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item) => {
            const contact = ProviderContactSchema.parse(item);
            return contact;
        });

        const nextCursor = items.length === 50 ? String(currentFrom + 50) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
