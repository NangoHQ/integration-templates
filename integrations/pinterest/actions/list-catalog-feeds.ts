import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    catalog_id: z.string().optional().describe('Filter feeds for a given catalog_id. Example: "864344156814050986"'),
    ad_account_id: z.string().optional().describe('Ad account ID for Business Access context. Example: "549770573673"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(250).optional().describe('Maximum number of feeds to return per page. Example: 25')
});

const ProviderFeedSchema = z
    .object({
        id: z.string(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        name: z.string().nullable().optional(),
        location: z.string().optional(),
        format: z.string().optional(),
        status: z.string().optional(),
        catalog_type: z.string().optional(),
        default_locale: z.string().optional(),
        default_country: z.string().optional(),
        default_currency: z.string().nullable().optional(),
        catalog_id: z.string().nullable().optional(),
        credentials: z.unknown().nullable().optional(),
        preferred_processing_schedule: z.unknown().optional()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    bookmark: z.string().nullable().optional(),
    items: z.array(z.unknown())
});

const OutputSchema = z.object({
    items: z.array(ProviderFeedSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List catalog data feeds.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['catalogs:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/feeds/list
            endpoint: '/v5/catalogs/feeds',
            params: {
                ...(input.catalog_id !== undefined && { catalog_id: input.catalog_id }),
                ...(input.ad_account_id !== undefined && { ad_account_id: input.ad_account_id }),
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);
        const items = providerResponse.items.map((item) => ProviderFeedSchema.parse(item));

        return {
            items,
            ...(providerResponse.bookmark != null && { next_cursor: providerResponse.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
