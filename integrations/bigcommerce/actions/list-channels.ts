import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    limit: z.number().optional().describe('Number of items per page. Example: 50'),
    date_modified_min: z.string().optional().describe('Filter by minimum date modified. Example: 2026-01-01T00:00:00Z'),
    type_in: z.array(z.string()).optional().describe('Filter by channel types. Example: ["storefront", "marketplace"]'),
    platform_in: z.array(z.string()).optional().describe('Filter by platforms. Example: ["bigcommerce", "amazon"]'),
    status_in: z.array(z.string()).optional().describe('Filter by statuses. Example: ["active", "connected"]')
});

const ChannelSchema = z.object({
    id: z.number(),
    name: z.string(),
    external_id: z.string().optional(),
    is_listable_from_ui: z.boolean().optional(),
    is_enabled: z.boolean().optional(),
    is_visible: z.boolean().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    platform: z.string().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    icon_url: z.string().optional()
});

const PaginationSchema = z.object({
    per_page: z.number().optional(),
    total: z.number().optional(),
    count: z.number().optional(),
    total_pages: z.number().optional(),
    current_page: z.number().optional(),
    links: z
        .object({
            previous: z.string().optional(),
            current: z.string().optional(),
            next: z.string().optional()
        })
        .optional()
});

const MetaSchema = z.object({
    pagination: PaginationSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ChannelSchema),
    meta: MetaSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(ChannelSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List all channels including the default storefront',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_channel_listings_read_only', 'store_channel_settings_read_only', 'store_sites_read_only'],
    endpoint: {
        method: 'POST',
        path: '/actions/list-channels'
    },
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? Number(input.cursor) : 1;
        const limit = input.limit ?? 50;

        const response = await nango.get({
            // https://developer.bigcommerce.com/docs/rest-management/channels
            endpoint: '/v3/channels',
            params: {
                page: page,
                limit: limit,
                ...(input.date_modified_min && { 'date_modified:min': input.date_modified_min }),
                ...(input.type_in && input.type_in.length > 0 && { 'type:in': input.type_in.join(',') }),
                ...(input.platform_in && input.platform_in.length > 0 && { 'platform:in': input.platform_in.join(',') }),
                ...(input.status_in && input.status_in.length > 0 && { 'status:in': input.status_in.join(',') })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        let next_cursor: string | undefined;
        const nextLink = providerResponse.meta?.pagination?.links?.next;
        if (typeof nextLink === 'string' && nextLink) {
            const params = new URLSearchParams(nextLink);
            const nextPage = params.get('page');
            if (nextPage) {
                next_cursor = nextPage;
            }
        }

        return {
            items: providerResponse.data,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
