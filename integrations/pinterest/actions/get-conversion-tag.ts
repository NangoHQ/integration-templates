import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    conversion_tag_id: z.string().describe('Conversion tag ID. Example: "2612511566392"')
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

const ProviderConversionTagSchema = z.object({
    ad_account_id: z.string(),
    status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT', 'DELETED_DRAFT']).optional(),
    code_snippet: z.string().optional(),
    configs: ConversionTagConfigsSchema.nullable().optional(),
    enhanced_match_status: z.enum(['UNKNOWN', 'NOT_VALIDATED', 'VALIDATING_IN_PROGRESS', 'VALIDATION_COMPLETE']).nullable().optional(),
    id: z.string(),
    last_fired_time_ms: z.number().nullable().optional(),
    name: z.string(),
    version: z.string().optional()
});

const OutputSchema = z.object({
    ad_account_id: z.string(),
    status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT', 'DELETED_DRAFT']).optional(),
    code_snippet: z.string().optional(),
    configs: ConversionTagConfigsSchema.nullable().optional(),
    enhanced_match_status: z.enum(['UNKNOWN', 'NOT_VALIDATED', 'VALIDATING_IN_PROGRESS', 'VALIDATION_COMPLETE']).nullable().optional(),
    id: z.string(),
    last_fired_time_ms: z.number().optional(),
    name: z.string(),
    version: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a conversion tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/conversion_tags-get/
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/conversion_tags/${encodeURIComponent(input.conversion_tag_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Conversion tag not found',
                ad_account_id: input.ad_account_id,
                conversion_tag_id: input.conversion_tag_id
            });
        }

        const providerTag = ProviderConversionTagSchema.parse(response.data);

        return {
            ad_account_id: providerTag.ad_account_id,
            id: providerTag.id,
            name: providerTag.name,
            ...(providerTag.status !== undefined && { status: providerTag.status }),
            ...(providerTag.code_snippet !== undefined && { code_snippet: providerTag.code_snippet }),
            ...(providerTag.configs !== undefined && { configs: providerTag.configs }),
            ...(providerTag.enhanced_match_status !== undefined && { enhanced_match_status: providerTag.enhanced_match_status }),
            ...(providerTag.last_fired_time_ms != null && { last_fired_time_ms: providerTag.last_fired_time_ms }),
            ...(providerTag.version !== undefined && { version: providerTag.version })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
