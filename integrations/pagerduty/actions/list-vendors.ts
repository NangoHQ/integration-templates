import { z } from 'zod';
import { createAction } from 'nango';

const VendorSchema = z.object({
    id: z.string().describe('Unique vendor identifier. Example: "P0GHC8I"'),
    name: z.string().describe('Short vendor name. Example: "Amazon CloudWatch"'),
    summary: z.string().optional().describe('Human-readable summary of the vendor.'),
    website_url: z.string().optional().describe('Vendor website URL.'),
    type: z.string().optional().describe('PagerDuty resource type. Always "vendor".')
});

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().min(1).max(100).optional().describe('Maximum number of vendors to return per page. Defaults to 25.')
    })
    .describe('Input parameters for listing integration vendors.');

const OutputSchema = z
    .object({
        vendors: z.array(VendorSchema).describe('List of integration vendors matching the query.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page. Omit or undefined when there are no more pages.')
    })
    .describe('Response containing a page of integration vendors and an optional next cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads the global integration vendor catalog from PagerDuty.
 * @pitfalls: The global vendor catalog contains hundreds of entries with no search or filter parameters; callers must paginate through all pages to locate a specific vendor by name.
 */
const action = createAction({
    description: 'List the global catalog of integration vendor types',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vendors.read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 25;
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/
            endpoint: '/vendors',
            params: {
                limit: String(limit),
                offset: String(offset)
            },
            retries: 3
        });

        const ProviderListSchema = z.object({
            vendors: z.array(z.unknown()),
            limit: z.number(),
            offset: z.number(),
            more: z.boolean(),
            total: z.number().nullable().optional()
        });

        const providerList = ProviderListSchema.parse(response.data);

        const vendors = providerList.vendors.map((item) => {
            const raw = z
                .object({
                    id: z.string(),
                    name: z.string(),
                    summary: z.string().nullable().optional(),
                    website_url: z.string().nullable().optional(),
                    type: z.string().nullable().optional()
                })
                .parse(item);

            return {
                id: raw.id,
                name: raw.name,
                ...(raw.summary != null && { summary: raw.summary }),
                ...(raw.website_url != null && { website_url: raw.website_url }),
                ...(raw.type != null && { type: raw.type })
            };
        });

        const nextOffset = providerList.offset + providerList.limit;
        const next_cursor = providerList.more ? String(nextOffset) : undefined;

        return {
            vendors,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
