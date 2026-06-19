import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    designId: z.string().describe('The design ID. Example: "DAHNACmCy_g"'),
    offset: z.number().min(1).max(500).optional().describe('The page index to start from (1-based). Defaults to 1.'),
    limit: z.number().min(1).max(200).optional().describe('The number of pages to return. Defaults to 50.')
});

const PageDimensionsSchema = z.object({
    width: z.number(),
    height: z.number()
});

const ThumbnailSchema = z.object({
    width: z.number(),
    height: z.number(),
    url: z.string()
});

const ProviderPageSchema = z.object({
    id: z.string().optional(),
    index: z.number(),
    page_number: z.number().optional(),
    dimensions: PageDimensionsSchema.optional(),
    thumbnail: ThumbnailSchema.optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderPageSchema)
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string().optional(),
            index: z.number(),
            page_number: z.number().optional(),
            dimensions: PageDimensionsSchema.optional(),
            thumbnail: ThumbnailSchema.optional()
        })
    )
});

const action = createAction({
    description: 'List pages in a design.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['design:content:read'],
    endpoint: {
        path: '/actions/get-design-pages',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { offset?: number; limit?: number } = {};
        if (input.offset !== undefined) {
            params.offset = input.offset;
        }
        if (input.limit !== undefined) {
            params.limit = input.limit;
        }

        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/designs/
            endpoint: `/rest/v1/designs/${encodeURIComponent(input.designId)}/pages`,
            params: params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((page) => ({
                ...(page.id !== undefined && { id: page.id }),
                index: page.index,
                ...(page.page_number !== undefined && { page_number: page.page_number }),
                ...(page.dimensions !== undefined && { dimensions: page.dimensions }),
                ...(page.thumbnail !== undefined && { thumbnail: page.thumbnail })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
