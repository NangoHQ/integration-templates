import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().min(1).max(50).optional().describe('Number of results per page. Default 50, maximum 50.'),
        page_info: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        since_id: z.string().optional().describe('Return price rules with IDs greater than this value.'),
        created_at_min: z.string().optional().describe('Minimum creation date in ISO 8601 format.'),
        created_at_max: z.string().optional().describe('Maximum creation date in ISO 8601 format.'),
        starts_at_min: z.string().optional().describe('Minimum start date in ISO 8601 format.'),
        starts_at_max: z.string().optional().describe('Maximum start date in ISO 8601 format.'),
        ends_at_min: z.string().optional().describe('Minimum end date in ISO 8601 format.'),
        ends_at_max: z.string().optional().describe('Maximum end date in ISO 8601 format.'),
        times_used: z.number().optional().describe('Number of times the price rule has been used.'),
        update_at_min: z.string().optional().describe('Minimum update date in ISO 8601 format. Note: the provider uses update_at_min, not updated_at_min.'),
        update_at_max: z.string().optional().describe('Maximum update date in ISO 8601 format. Note: the provider uses update_at_max, not updated_at_max.')
    })
    .describe('Input for listing price rules with optional filtering and pagination.');

const PriceRuleSchema = z
    .object({
        id: z.string().describe('Unique identifier for the price rule.'),
        title: z.string().optional().describe('Title of the price rule.'),
        target_type: z.string().optional().describe('Type of target for the discount.'),
        target_selection: z.string().optional().describe('Target selection scope.'),
        allocation_method: z.string().optional().describe('Allocation method for the discount.'),
        value_type: z.string().optional().describe('Type of discount value (e.g., percentage, fixed_amount).'),
        value: z.string().optional().describe('Discount value amount.'),
        usage_per_customer: z.number().nullable().optional().describe('Maximum number of times the discount can be used per customer.'),
        usage_limit: z.number().nullable().optional().describe('Maximum number of times the discount can be used overall.'),
        starts_at: z.string().optional().describe('Start date and time in ISO 8601 format.'),
        ends_at: z.string().nullable().optional().describe('End date and time in ISO 8601 format. Null if no expiration.'),
        create_at: z.string().optional().describe('Creation date and time in ISO 8601 format.'),
        update_at: z.string().optional().describe('Last update date and time in ISO 8601 format.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        price_rules: z.array(PriceRuleSchema).describe('Array of price rules matching the filters.'),
        next_page_info: z.string().optional().describe('Cursor for the next page, extracted from the Link header. Absent if this is the last page.')
    })
    .describe('Output containing the list of price rules and optional next page cursor.');

const ProviderResponseSchema = z.object({
    price_rules: z.array(z.unknown())
});

function extractNextPageInfo(headers: Record<string, unknown>): string | undefined {
    const linkHeader = headers['link'] || headers['Link'];
    if (typeof linkHeader !== 'string') {
        return undefined;
    }
    const match = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/);
    return match ? match[1] : undefined;
}

/**
 * @tags: [read]
 * @tagReason: Lists discount price rules from the provider API.
 * @pitfalls: The provider uses update_at_min and update_at_max for filtering (not updated_at_*) and returns create_at and update_at timestamp fields instead of created_at and updated_at.
 */
const action = createAction({
    description: 'List discount price rules with filtering and pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/sales/price-rules/price-rules-list
        const response = await nango.get({
            endpoint: '/admin/openapi/v20260601/sales/price_rules.json',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.page_info !== undefined && { page_info: input.page_info }),
                ...(input.since_id !== undefined && { since_id: input.since_id }),
                ...(input.created_at_min !== undefined && { created_at_min: input.created_at_min }),
                ...(input.created_at_max !== undefined && { created_at_max: input.created_at_max }),
                ...(input.starts_at_min !== undefined && { starts_at_min: input.starts_at_min }),
                ...(input.starts_at_max !== undefined && { starts_at_max: input.starts_at_max }),
                ...(input.ends_at_min !== undefined && { ends_at_min: input.ends_at_min }),
                ...(input.ends_at_max !== undefined && { ends_at_max: input.ends_at_max }),
                ...(input.times_used !== undefined && { times_used: input.times_used }),
                ...(input.update_at_min !== undefined && { update_at_min: input.update_at_min }),
                ...(input.update_at_max !== undefined && { update_at_max: input.update_at_max })
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const priceRules = parsedResponse.price_rules.map((item: unknown) => {
            return PriceRuleSchema.parse(item);
        });

        return {
            price_rules: priceRules,
            ...(extractNextPageInfo(response.headers) !== undefined && { next_page_info: extractNextPageInfo(response.headers) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
