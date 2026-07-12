import * as z from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().describe('Search query. Can contain pin description keywords or comma-separated pin IDs.'),
    bookmark: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().int().optional().describe('Maximum number of items to return per page.'),
    pin_metrics: z.boolean().optional().describe('Whether to return 90d and lifetime Pin metrics.'),
    ad_account_id: z.string().optional().describe('Ad account ID for Business Access. Uses the ad account owner as the operation user_account.')
});

const PinMediaSchema = z
    .object({
        media_type: z.string().optional(),
        images: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough()
    .optional();

const PinSchema = z
    .object({
        id: z.string(),
        board_id: z.string().optional(),
        board_section_id: z.string().nullable().optional(),
        created_at: z.string().optional(),
        description: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        link: z.string().nullable().optional(),
        alt_text: z.string().nullable().optional(),
        dominant_color: z.string().nullable().optional(),
        parent_pin_id: z.string().nullable().optional(),
        has_been_promoted: z.boolean().optional(),
        is_owner: z.boolean().optional(),
        is_product: z.boolean().optional(),
        is_standard: z.boolean().optional(),
        creative_type: z.string().nullable().optional(),
        media: PinMediaSchema,
        pin_metrics: z.record(z.string(), z.unknown()).nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    items: z.array(PinSchema),
    bookmark: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(PinSchema),
    bookmark: z.string().optional()
});

const action = createAction({
    description: "Search the account's own pins.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pins:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            query: input.query
        };
        if (input.bookmark !== undefined) {
            params['bookmark'] = input.bookmark;
        }
        if (input.page_size !== undefined) {
            params['page_size'] = input.page_size;
        }
        if (input.pin_metrics !== undefined) {
            params['pin_metrics'] = input.pin_metrics ? 'true' : 'false';
        }
        if (input.ad_account_id !== undefined) {
            params['ad_account_id'] = input.ad_account_id;
        }

        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#tag/search/operation/search_user_pins/list
            endpoint: '/v5/search/pins',
            params,
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Pinterest search pins API.'
            });
        }

        const parsed = ProviderResponseSchema.parse(raw);

        return {
            items: parsed.items,
            ...(parsed.bookmark != null && { bookmark: parsed.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
