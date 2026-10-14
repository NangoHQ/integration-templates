import { z } from 'zod';
import { createAction } from 'nango';

const ProviderMerchantSchema = z.object({
    id: z.string(),
    merchant_name: z.string(),
    sk_category_name: z.string().nullable(),
    is_auto_approved: z.boolean()
});

const ProviderPageSchema = z.object({
    data: z.array(ProviderMerchantSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

const MerchantSchema = z.object({
    id: z.string().describe('Unique identifier for the merchant. Example: "d38a988c-377a-421b-9017-0c8f40a4304e"'),
    merchant_name: z.string().describe('Display name of the merchant. Example: "Google"'),
    sk_category_name: z
        .string()
        .nullable()
        .describe('Category classification of the merchant, or null when Ramp has not categorized it. Example: "Advertising"'),
    is_auto_approved: z.boolean().describe('Whether transactions from this merchant are exempt from receipt submission requirements.')
});

const InputSchema = z
    .object({
        merchant_name: z.string().optional().describe('Filter merchants by a case-sensitive display name prefix. Example: "Goo"'),
        merchant_url: z.string().optional().describe('Filter merchants by URL or domain after normalization. Example: "google.com"'),
        transaction_from_date: z
            .string()
            .optional()
            .describe('Only include merchants with transactions occurring on or after this ISO-8601 datetime. Example: "2026-01-01T00:00:00Z"'),
        transaction_to_date: z
            .string()
            .optional()
            .describe('Only include merchants with transactions occurring on or before this ISO-8601 datetime. Example: "2026-12-31T23:59:59Z"'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of merchants to return per page, between 2 and 100. Defaults to 20.'),
        cursor: z.string().min(1).optional().describe('Pagination cursor from the previous response (`next_cursor`). Omit for the first page.')
    })
    .describe('Filters and pagination for listing merchants.');

const OutputSchema = z
    .object({
        merchants: z.array(MerchantSchema).describe('Merchants matching the filters, for this page.'),
        next_cursor: z.string().optional().describe('Cursor to pass as `cursor` to fetch the next page. Absent when there are no more results.')
    })
    .describe('A page of merchants and the cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Retrieves merchants from the provider without modifying any provider state.
 * @pitfalls: transaction_from_date/transaction_to_date require full ISO-8601 datetimes (a bare date is rejected); merchant_name matches a case-sensitive display-name prefix; sk_category_name is null for merchants Ramp has not categorized.
 */
const action = createAction({
    description: 'List merchants the business has transacted with, with category and auto-approval metadata.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['merchants:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // Docs: https://docs.ramp.com/openapi/developer-api.json (path /developer/v1/merchants)
            endpoint: '/developer/v1/merchants',
            params: {
                ...(input.merchant_name !== undefined && { merchant_name: input.merchant_name }),
                ...(input.merchant_url !== undefined && { merchant_url: input.merchant_url }),
                ...(input.transaction_from_date !== undefined && { transaction_from_date: input.transaction_from_date }),
                ...(input.transaction_to_date !== undefined && { transaction_to_date: input.transaction_to_date }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.cursor !== undefined && { start: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderPageSchema.parse(response.data);

        let nextCursor: string | undefined;
        if (parsed.page.next != null) {
            const start = new URL(parsed.page.next).searchParams.get('start');
            if (start != null && start.length > 0) {
                nextCursor = start;
            }
        }

        return {
            merchants: parsed.data.map((merchant) => ({
                id: merchant.id,
                merchant_name: merchant.merchant_name,
                sk_category_name: merchant.sk_category_name,
                is_auto_approved: merchant.is_auto_approved
            })),
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
