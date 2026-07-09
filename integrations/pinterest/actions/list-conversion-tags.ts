import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    filter_deleted: z.boolean().optional().describe('Filter out deleted tags.'),
    bookmark: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ConversionTagConfigsSchema = z.object({
    aem_db_enabled: z.boolean().nullable().optional(),
    aem_enabled: z.boolean().nullable().optional(),
    aem_external_id_enabled: z.boolean().nullable().optional(),
    aem_fnln_enabled: z.boolean().nullable().optional(),
    aem_ge_enabled: z.boolean().nullable().optional(),
    aem_loc_enabled: z.boolean().nullable().optional(),
    aem_ph_enabled: z.boolean().nullable().optional(),
    md_frequency: z.number().nullable().optional(),
    no_code_capi_domains: z.array(z.string()).optional()
});

const ConversionTagSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    name: z.string(),
    status: z.string().optional(),
    code_snippet: z.string().optional(),
    configs: ConversionTagConfigsSchema.nullable().optional(),
    enhanced_match_status: z.string().nullable().optional(),
    last_fired_time_ms: z.number().nullable().optional(),
    version: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    items: z.array(ConversionTagSchema),
    bookmark: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(ConversionTagSchema),
    bookmark: z.string().optional()
});

const action = createAction({
    description: 'List conversion (tracking) tags.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#tag/conversion_tags/operation/conversion_tags/list
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/conversion_tags`,
            params: {
                ...(input.filter_deleted !== undefined && { filter_deleted: String(input.filter_deleted) }),
                ...(input.bookmark && { bookmark: input.bookmark })
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            items: parsed.items,
            ...(parsed.bookmark != null && { bookmark: parsed.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
