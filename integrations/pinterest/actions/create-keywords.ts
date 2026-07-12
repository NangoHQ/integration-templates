import { z } from 'zod';
import { createAction } from 'nango';

const KeywordCreateSchema = z.object({
    match_type: z.enum(['BROAD', 'PHRASE', 'EXACT', 'EXACT_NEGATIVE', 'PHRASE_NEGATIVE']).describe('Keyword match type'),
    value: z.string().max(120).describe('Keyword value (120 chars max)'),
    bid: z.number().optional().describe('Keyword custom bid in microcurrency')
});

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    parent_id: z.string().describe('Keyword parent entity ID (ad group, campaign, or advertiser). Example: "2680091388706"'),
    keywords: z.array(KeywordCreateSchema).describe('Keywords to create')
});

const ProviderKeywordSchema = z.object({
    id: z.string(),
    parent_id: z.string(),
    match_type: z.string().nullable(),
    value: z.string(),
    archived: z.boolean().optional(),
    bid: z.number().nullable().optional(),
    parent_type: z.string().optional(),
    type: z.string().optional()
});

const ProviderKeywordErrorSchema = z.object({
    data: ProviderKeywordSchema.nullable().optional(),
    error_messages: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    keywords: z.array(ProviderKeywordSchema),
    errors: z.array(ProviderKeywordErrorSchema)
});

const action = createAction({
    description: 'Create targeting keywords',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input) => {
        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#operation/keywords/create
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/keywords`,
            data: {
                parent_id: input.parent_id,
                keywords: input.keywords.map((keyword) => ({
                    match_type: keyword.match_type,
                    value: keyword.value,
                    ...(keyword.bid !== undefined && { bid: keyword.bid })
                }))
            },
            retries: 10
        });

        const providerResponse = z
            .object({
                keywords: z.array(z.unknown()).default([]),
                errors: z.array(z.unknown()).default([])
            })
            .parse(response.data);

        return {
            keywords: providerResponse.keywords.map((item) => ProviderKeywordSchema.parse(item)),
            errors: providerResponse.errors.map((item) => ProviderKeywordErrorSchema.parse(item))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
