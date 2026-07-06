import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const SegmentAttributesSchema = z.object({
    name: z.string(),
    created: z.string().optional(),
    updated: z.string().optional()
});

const SegmentDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: SegmentAttributesSchema
});

const LinksSchema = z.object({
    self: z.string().optional(),
    next: z.string().nullable().optional(),
    prev: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(SegmentDataSchema),
    links: LinksSchema.optional()
});

const SegmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    created: z.string().optional(),
    updated: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(SegmentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List segments.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['segments:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/get_segments
        const response = await nango.get({
            endpoint: '/api/segments',
            params: {
                ...(input.cursor && { 'page[cursor]': input.cursor })
            },
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item) => ({
            id: item.id,
            name: item.attributes.name,
            ...(item.attributes.created !== undefined && { created: item.attributes.created }),
            ...(item.attributes.updated !== undefined && { updated: item.attributes.updated })
        }));

        let nextCursor: string | undefined;
        if (providerResponse.links?.next) {
            const nextUrl = new URL(providerResponse.links.next);
            const cursor = nextUrl.searchParams.get('page[cursor]');
            if (cursor) {
                nextCursor = cursor;
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
