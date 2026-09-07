import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        price_rule_id: z.string().describe('The ID of the price rule whose discount codes should be listed.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input for listing discount codes attached to a given price rule.');

const DiscountCodeSchema = z
    .object({
        id: z.string().describe('Unique identifier of the discount code.'),
        code: z.string().describe('The redeemable code string.'),
        price_rule_id: z.string().describe('The ID of the parent price rule this code belongs to.'),
        usage_count: z.number().describe('Number of times this code has been used.'),
        create_at: z.string().describe('ISO 8601 timestamp when the discount code was created.'),
        update_at: z.string().describe('ISO 8601 timestamp when the discount code was last updated.')
    })
    .describe('A single discount code attached to the price rule.');

const OutputSchema = z
    .object({
        discount_codes: z.array(DiscountCodeSchema).describe('List of discount codes for the given price rule.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page of results. Absent when there are no more pages.')
    })
    .describe('Output containing discount codes attached to a given price rule and optional pagination cursor.');

const ProviderDiscountCodeSchema = z.object({
    id: z.unknown(),
    code: z.unknown(),
    price_rule_id: z.unknown(),
    usage_count: z.unknown(),
    create_at: z.unknown(),
    update_at: z.unknown()
});

const ProviderResponseSchema = z.object({
    discount_codes: z.array(ProviderDiscountCodeSchema)
});

/**
 * @tags: [read]
 * @tagReason: Only reads discount codes from the provider.
 * @pitfalls: There is no global discount-code list; you must iterate all price rules to collect every code, and deleting a price rule permanently removes its codes.
 */
const action = createAction({
    description: 'List all discount codes attached to a given price rule.',
    version: '1.0.0',

    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/sales/price-rule/discount-codes
        const response = await nango.get({
            endpoint: `/admin/openapi/v20260601/sales/price_rules/${encodeURIComponent(input.price_rule_id)}/discount_codes.json`,
            params: {
                ...(input.cursor && { page_info: input.cursor })
            },
            retries: 3
        });

        const linkHeader = response.headers?.['link'];
        let nextCursor: string | undefined;
        if (typeof linkHeader === 'string') {
            const match = linkHeader.match(/page_info=([^&>]+)/);
            if (match && linkHeader.includes('rel="next"')) {
                nextCursor = match[1];
            }
        }

        const rawData = ProviderResponseSchema.parse(response.data);

        const discountCodes = rawData.discount_codes.map((item) => {
            return {
                id: String(item['id'] ?? ''),
                code: String(item['code'] ?? ''),
                price_rule_id: String(item['price_rule_id'] ?? ''),
                usage_count: Number(item['usage_count'] ?? 0),
                create_at: String(item['create_at'] ?? ''),
                update_at: String(item['update_at'] ?? '')
            };
        });

        return {
            discount_codes: discountCodes,
            ...(nextCursor && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
