import { z } from 'zod';
import { createAction } from 'nango';

const FilteringSchema = z.object({
    available_for_catalog_only: z.boolean().optional()
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    pixel_id: z.string().optional().describe('Pixel ID to filter by.'),
    code: z.string().optional().describe('Pixel code to filter by.'),
    name: z.string().optional().describe('Pixel name to filter by.'),
    order_by: z.enum(['EARLIEST_CREATE', 'LATEST_CREATE']).optional().describe('Sort order. Defaults to EARLIEST_CREATE.'),
    filtering: FilteringSchema.optional().describe('Additional filters for the pixel list.'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    page_size: z.number().int().min(1).max(100).optional().describe('Number of results per page. Max 100.')
});

const PixelSchema = z
    .object({
        pixel_id: z.string(),
        pixel_name: z.string().optional(),
        pixel_code: z.string().optional(),
        pixel_setup_mode: z.string().optional(),
        pixel_category: z.string().optional(),
        activity_status: z.string().optional(),
        create_time: z.string().optional(),
        partner_name: z.string().nullable().optional(),
        has_pcm_config: z.unknown().optional(),
        events: z.array(z.unknown()).optional(),
        pixel_script: z.string().optional(),
        advanced_matching_fields: z.record(z.string(), z.boolean()).optional(),
        asset_ownership: z
            .object({
                owner_bc_id: z.string().nullable().optional(),
                asset_relation_status: z.string().nullable().optional(),
                updated_at: z.number().optional(),
                ownership_status: z.boolean().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const PageInfoSchema = z.object({
    page: z.number().int(),
    page_size: z.number().int(),
    total_number: z.number().int(),
    total_page: z.number().int()
});

const ProviderResponseSchema = z.object({
    code: z.number().int(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z
        .object({
            pixels: z.array(PixelSchema),
            page_info: PageInfoSchema
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(PixelSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List pixels from TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-pixels',
        group: 'Pixels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1 || (input.cursor && !/^\d+$/.test(input.cursor))) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid positive integer string'
            });
        }

        const params: Record<string, string | number> = {
            advertiser_id: input.advertiser_id,
            page: page,
            ...(input.page_size !== undefined && { page_size: input.page_size }),
            ...(input.pixel_id !== undefined && { pixel_id: input.pixel_id }),
            ...(input.code !== undefined && { code: input.code }),
            ...(input.name !== undefined && { name: input.name }),
            ...(input.order_by !== undefined && { order_by: input.order_by }),
            ...(input.filtering !== undefined && { filtering: JSON.stringify(input.filtering) })
        };

        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1740858697598978
            endpoint: '/pixel/list/',
            params: params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response format from TikTok API',
                raw_response: JSON.stringify(response.data),
                details: parsed.error.message
            });
        }

        if (parsed.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.data.message || 'TikTok API returned an error',
                code: parsed.data.code,
                request_id: parsed.data.request_id
            });
        }

        if (!parsed.data.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'TikTok API response missing data field',
                raw_response: JSON.stringify(response.data)
            });
        }

        const pageInfo = parsed.data.data.page_info;
        const hasNextPage = pageInfo.page < pageInfo.total_page;

        return {
            items: parsed.data.data.pixels,
            ...(hasNextPage && { next_cursor: String(pageInfo.page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
