import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.number().describe('BigCommerce channel ID. Example: 1'),
    cursor: z.string().optional().describe('Pagination cursor (after) from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of results per page. Example: 50'),
    date_modified_min: z.string().optional().describe('ISO8601 timestamp to filter listings modified after this date. Example: 2026-01-01T00:00:00Z'),
    product_id_in: z.array(z.number()).optional().describe('Array of product IDs to filter listings by. Example: [123, 456]')
});

const VariantSchema = z
    .object({
        variant_id: z.number(),
        channel_id: z.number().optional(),
        product_id: z.number().optional(),
        external_id: z.string().optional(),
        state: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        date_created: z.string().optional(),
        date_modified: z.string().optional()
    })
    .passthrough();

const ListingSchema = z
    .object({
        channel_id: z.number(),
        listing_id: z.number(),
        product_id: z.number(),
        external_id: z.string().optional(),
        state: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        date_created: z.string().optional(),
        date_modified: z.string().optional(),
        variants: z.array(VariantSchema).optional()
    })
    .passthrough();

const MetaPaginationSchema = z
    .object({
        count: z.number().optional(),
        total: z.number().optional(),
        per_page: z.number().optional(),
        current_page: z.number().optional(),
        total_pages: z.number().optional(),
        links: z
            .object({
                previous: z.string().nullable().optional(),
                current: z.string().nullable().optional(),
                next: z.string().nullable().optional()
            })
            .optional()
    })
    .optional();

const ProviderResponseSchema = z.object({
    data: z.array(ListingSchema),
    meta: z
        .object({
            pagination: MetaPaginationSchema
        })
        .optional()
});

const OutputSchema = z.object({
    listings: z.array(ListingSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List product listings for a channel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_channel_listings_read_only'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            limit: input.limit ?? 50
        };
        if (input.cursor !== undefined) {
            params['after'] = input.cursor;
        }
        if (input.date_modified_min !== undefined) {
            params['date_modified:min'] = input.date_modified_min;
        }
        if (input.product_id_in !== undefined && input.product_id_in.length > 0) {
            params['product_id:in'] = input.product_id_in.join(',');
        }

        const response = await nango.get({
            // https://developer.bigcommerce.com/docs/rest-management/channels/listings#get-channel-listings
            endpoint: `/v3/channels/${encodeURIComponent(String(input.channel_id))}/listings`,
            params,
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const listings = parsedResponse.data;
        let next_cursor: string | undefined;
        const nextLink = parsedResponse.meta?.pagination?.links?.next;
        if (typeof nextLink === 'string') {
            let after: string | null = null;
            if (nextLink.startsWith('?')) {
                after = new URLSearchParams(nextLink).get('after');
            } else {
                after = new URL(nextLink).searchParams.get('after');
            }
            if (after) {
                next_cursor = after;
            }
        }

        return {
            listings,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
