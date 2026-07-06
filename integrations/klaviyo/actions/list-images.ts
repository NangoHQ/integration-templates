import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ImageSchema = z.object({
    type: z.literal('image'),
    id: z.string(),
    attributes: z
        .object({
            name: z.string().optional(),
            image_url: z.string().optional(),
            format: z.string().optional(),
            size: z.number().optional(),
            hidden: z.boolean().optional(),
            updated_at: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ImageSchema),
    links: z
        .object({
            next: z.string().nullable().optional(),
            self: z.string().nullable().optional(),
            prev: z.string().nullable().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string().optional(),
            image_url: z.string().optional(),
            format: z.string().optional(),
            size: z.number().optional(),
            hidden: z.boolean().optional(),
            updated_at: z.string().optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List images.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['images:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.klaviyo.com/en/reference/get_images
            endpoint: '/api/images',
            params: {
                ...(input.cursor !== undefined && { 'page[cursor]': input.cursor })
            },
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item) => ({
            id: item.id,
            ...(item.attributes?.name !== undefined && { name: item.attributes.name }),
            ...(item.attributes?.image_url !== undefined && { image_url: item.attributes.image_url }),
            ...(item.attributes?.format !== undefined && { format: item.attributes.format }),
            ...(item.attributes?.size !== undefined && { size: item.attributes.size }),
            ...(item.attributes?.hidden !== undefined && { hidden: item.attributes.hidden }),
            ...(item.attributes?.updated_at !== undefined && { updated_at: item.attributes.updated_at })
        }));

        let nextCursor: string | undefined;
        if (providerResponse.links?.next) {
            const nextUrl = new URL(providerResponse.links.next);
            const cursor = nextUrl.searchParams.get('page[cursor]');
            if (cursor !== null) {
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
