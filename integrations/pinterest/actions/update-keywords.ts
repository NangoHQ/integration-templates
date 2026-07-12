import { z } from 'zod';
import { createAction } from 'nango';

const KeywordUpdateItemSchema = z.object({
    id: z.string().describe('Keyword ID. Example: "383791336903426391"'),
    archived: z.boolean().optional().describe('Archive the keyword.'),
    bid: z.number().nullable().optional().describe('Deprecated. Keyword custom bid in microcurrency.')
});

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    keywords: z.array(KeywordUpdateItemSchema).describe('Keywords to update.')
});

const KeywordSchema = z.object({
    id: z.string(),
    parent_id: z.string(),
    parent_type: z.string().optional(),
    type: z.string().optional(),
    match_type: z.string().nullable().optional(),
    value: z.string().optional(),
    archived: z.boolean().optional(),
    bid: z.number().nullable().optional()
});

const KeywordErrorSchema = z.object({
    data: KeywordSchema.optional(),
    error_messages: z.array(z.string()).optional()
});

const ProviderResponseSchema = z.object({
    errors: z.array(KeywordErrorSchema),
    keywords: z.array(KeywordSchema)
});

const OutputSchema = z.object({
    errors: z.array(KeywordErrorSchema),
    keywords: z.array(KeywordSchema)
});

const action = createAction({
    description: 'Update targeting keywords.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developers.pinterest.com/docs/api/v5/#operation/keywords/update
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/keywords`,
            data: {
                keywords: input.keywords
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            errors: providerResponse.errors,
            keywords: providerResponse.keywords
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
