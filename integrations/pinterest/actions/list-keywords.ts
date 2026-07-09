import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    ad_group_ids: z.array(z.string()).optional().describe('Ad group IDs to filter by. Up to 250.'),
    campaign_ids: z.array(z.string()).optional().describe('Campaign IDs to filter by. Up to 250.'),
    match_types: z
        .array(z.enum(['BROAD', 'PHRASE', 'EXACT', 'EXACT_NEGATIVE', 'PHRASE_NEGATIVE']))
        .optional()
        .describe('Keyword match types to filter by.'),
    page_size: z.number().int().min(1).max(250).optional().describe('Maximum number of items per page. Defaults to 25.'),
    cursor: z.string().optional().describe('Pagination cursor (bookmark) from the previous response.')
});

const KeywordSchema = z.object({
    archived: z.boolean().optional(),
    bid: z.number().nullable().optional(),
    id: z.string(),
    match_type: z.enum(['BROAD', 'PHRASE', 'EXACT', 'EXACT_NEGATIVE', 'PHRASE_NEGATIVE']).nullable().optional(),
    parent_id: z.string(),
    parent_type: z.string().optional(),
    type: z.string().optional(),
    value: z.string()
});

const OutputSchema = z.object({
    items: z.array(KeywordSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: "List targeting keywords for an ad account's ad groups.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.ad_group_ids && !input.campaign_ids) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either ad_group_ids or campaign_ids is required.'
            });
        }

        if (input.ad_group_ids && input.ad_group_ids.length > 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Only a single ad group ID is supported by the Pinterest API for this endpoint.'
            });
        }

        if (input.campaign_ids && input.campaign_ids.length > 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Only a single campaign ID is supported by the Pinterest API for this endpoint.'
            });
        }

        const params = {
            ...(input.ad_group_ids && input.ad_group_ids.length > 0 && { ad_group_id: input.ad_group_ids[0] }),
            ...(input.campaign_ids && input.campaign_ids.length > 0 && { campaign_id: input.campaign_ids[0] }),
            ...(input.match_types && input.match_types.length > 0 && { match_types: input.match_types }),
            ...(input.page_size !== undefined && { page_size: input.page_size }),
            ...(input.cursor && { bookmark: input.cursor })
        };

        // https://developers.pinterest.com/docs/api/v5/keywords-get/
        const response = await nango.get({
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/keywords`,
            params,
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Pinterest API.'
            });
        }

        const rawItems = 'items' in raw && Array.isArray(raw.items) ? raw.items : [];
        const items = rawItems.map((item: unknown) => KeywordSchema.parse(item));

        return {
            items,
            ...('bookmark' in raw && typeof raw.bookmark === 'string' && raw.bookmark.length > 0 && { next_cursor: raw.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
