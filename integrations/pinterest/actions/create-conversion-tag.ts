import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    name: z.string().describe('Conversion tag name. Example: "download_picture"'),
    aem_enabled: z.boolean().optional().describe('Whether Automatic Enhanced Match email is enabled.'),
    aem_db_enabled: z.boolean().optional().describe('Whether Automatic Enhanced Match birthdate is enabled.'),
    aem_external_id_enabled: z.boolean().optional().describe('Whether Automatic Enhanced Match external ID is enabled.'),
    aem_fnln_enabled: z.boolean().optional().describe('Whether Automatic Enhanced Match first/last name is enabled.'),
    aem_ge_enabled: z.boolean().optional().describe('Whether Automatic Enhanced Match gender is enabled.'),
    aem_loc_enabled: z.boolean().optional().describe('Whether Automatic Enhanced Match location is enabled.'),
    aem_ph_enabled: z.boolean().optional().describe('Whether Automatic Enhanced Match phone is enabled.'),
    md_frequency: z.number().optional().describe('Metadata ingestion frequency.')
});

const ProviderConversionTagSchema = z.object({
    ad_account_id: z.string(),
    code_snippet: z.string().optional(),
    configs: z
        .object({
            aem_db_enabled: z.boolean().nullable().optional(),
            aem_enabled: z.boolean().nullable().optional(),
            aem_external_id_enabled: z.boolean().nullable().optional(),
            aem_fnln_enabled: z.boolean().nullable().optional(),
            aem_ge_enabled: z.boolean().nullable().optional(),
            aem_loc_enabled: z.boolean().nullable().optional(),
            aem_ph_enabled: z.boolean().nullable().optional(),
            md_frequency: z.number().nullable().optional()
        })
        .optional(),
    enhanced_match_status: z.string().nullable().optional(),
    id: z.string(),
    last_fired_time_ms: z.number().nullable().optional(),
    name: z.string(),
    status: z.string().optional(),
    version: z.string().optional()
});

const OutputSchema = z.object({
    ad_account_id: z.string(),
    code_snippet: z.string().optional(),
    configs: z
        .object({
            aem_db_enabled: z.boolean().optional(),
            aem_enabled: z.boolean().optional(),
            aem_external_id_enabled: z.boolean().optional(),
            aem_fnln_enabled: z.boolean().optional(),
            aem_ge_enabled: z.boolean().optional(),
            aem_loc_enabled: z.boolean().optional(),
            aem_ph_enabled: z.boolean().optional(),
            md_frequency: z.number().optional()
        })
        .optional(),
    enhanced_match_status: z.string().optional(),
    id: z.string(),
    last_fired_time_ms: z.number().optional(),
    name: z.string(),
    status: z.string().optional(),
    version: z.string().optional()
});

const action = createAction({
    description: 'Create a conversion (tracking) tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            name: input.name
        };

        if (input.aem_enabled !== undefined) {
            requestBody['aem_enabled'] = input.aem_enabled;
        }
        if (input.aem_db_enabled !== undefined) {
            requestBody['aem_db_enabled'] = input.aem_db_enabled;
        }
        if (input.aem_external_id_enabled !== undefined) {
            requestBody['aem_external_id_enabled'] = input.aem_external_id_enabled;
        }
        if (input.aem_fnln_enabled !== undefined) {
            requestBody['aem_fnln_enabled'] = input.aem_fnln_enabled;
        }
        if (input.aem_ge_enabled !== undefined) {
            requestBody['aem_ge_enabled'] = input.aem_ge_enabled;
        }
        if (input.aem_loc_enabled !== undefined) {
            requestBody['aem_loc_enabled'] = input.aem_loc_enabled;
        }
        if (input.aem_ph_enabled !== undefined) {
            requestBody['aem_ph_enabled'] = input.aem_ph_enabled;
        }
        if (input.md_frequency !== undefined) {
            requestBody['md_frequency'] = input.md_frequency;
        }

        // https://developers.pinterest.com/docs/api/v5/#operation/conversion_tags/create
        const response = await nango.post({
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/conversion_tags`,
            data: requestBody,
            retries: 3
        });

        const providerTag = ProviderConversionTagSchema.parse(response.data);

        return {
            ad_account_id: providerTag.ad_account_id,
            ...(providerTag.code_snippet !== undefined && { code_snippet: providerTag.code_snippet }),
            ...(providerTag.configs !== undefined && {
                configs: {
                    ...(providerTag.configs.aem_db_enabled != null && { aem_db_enabled: providerTag.configs.aem_db_enabled }),
                    ...(providerTag.configs.aem_enabled != null && { aem_enabled: providerTag.configs.aem_enabled }),
                    ...(providerTag.configs.aem_external_id_enabled != null && { aem_external_id_enabled: providerTag.configs.aem_external_id_enabled }),
                    ...(providerTag.configs.aem_fnln_enabled != null && { aem_fnln_enabled: providerTag.configs.aem_fnln_enabled }),
                    ...(providerTag.configs.aem_ge_enabled != null && { aem_ge_enabled: providerTag.configs.aem_ge_enabled }),
                    ...(providerTag.configs.aem_loc_enabled != null && { aem_loc_enabled: providerTag.configs.aem_loc_enabled }),
                    ...(providerTag.configs.aem_ph_enabled != null && { aem_ph_enabled: providerTag.configs.aem_ph_enabled }),
                    ...(providerTag.configs.md_frequency != null && { md_frequency: providerTag.configs.md_frequency })
                }
            }),
            ...(providerTag.enhanced_match_status != null && { enhanced_match_status: providerTag.enhanced_match_status }),
            id: providerTag.id,
            ...(providerTag.last_fired_time_ms != null && { last_fired_time_ms: providerTag.last_fired_time_ms }),
            name: providerTag.name,
            ...(providerTag.status !== undefined && { status: providerTag.status }),
            ...(providerTag.version !== undefined && { version: providerTag.version })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
