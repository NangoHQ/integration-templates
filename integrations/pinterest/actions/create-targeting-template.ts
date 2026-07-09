import { z } from 'zod';
import { createAction } from 'nango';

const TargetingAttributesSchema = z
    .object({
        GEO: z.array(z.string()).optional(),
        INTEREST: z.array(z.string()).optional(),
        GENDER: z.array(z.string()).optional(),
        AGE_BUCKET: z.array(z.string()).optional(),
        MINIMUM_AGE: z.string().optional(),
        MAXIMUM_AGE: z.string().optional(),
        APPTYPE: z.array(z.string()).optional(),
        AUDIENCE_INCLUDE: z.array(z.string()).optional(),
        AUDIENCE_EXCLUDE: z.array(z.string()).optional(),
        LOCALE: z.array(z.string()).optional(),
        LOCATION: z.array(z.string()).optional(),
        LOCATION_EXCLUDE: z.array(z.string()).optional(),
        GEO_EXCLUDE: z.array(z.string()).optional(),
        TARGETING_STRATEGY: z.array(z.string()).optional(),
        SHOPPING_RETARGETING: z
            .array(
                z.object({
                    lookback_window: z.number().optional(),
                    exclusion_window: z.number().optional(),
                    tag_types: z.array(z.number()).optional()
                })
            )
            .optional()
    })
    .passthrough();

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    name: z.string().describe('Targeting template name. Example: "My Template"'),
    targeting_attributes: TargetingAttributesSchema.describe('Targeting profile attributes. Use "targeting_attributes", not "targeting_spec".'),
    auto_targeting_enabled: z.boolean().optional().describe('Enable auto-targeting for ad group. Default: true'),
    placement_group: z.string().optional().describe('Placement group type.'),
    keywords: z.array(z.object({}).passthrough()).optional().describe('Keyword targeting specs.'),
    tracking_urls: z.object({}).passthrough().optional().describe('Tracking URLs.')
});

const ProviderTargetingTemplateSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    ad_account_id: z.string().optional(),
    targeting_attributes: z.object({}).passthrough().optional(),
    status: z.string().optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional(),
    auto_targeting_enabled: z.boolean().optional(),
    placement_group: z.string().optional(),
    valid: z.boolean().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    ad_account_id: z.string().optional(),
    targeting_attributes: z.object({}).passthrough().optional(),
    status: z.string().optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional(),
    auto_targeting_enabled: z.boolean().optional()
});

const action = createAction({
    description: 'Create a reusable targeting template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#operation/targeting_template/create
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/targeting_templates`,
            data: {
                name: input.name,
                targeting_attributes: input.targeting_attributes,
                ...(input.auto_targeting_enabled !== undefined && { auto_targeting_enabled: input.auto_targeting_enabled }),
                ...(input.placement_group !== undefined && { placement_group: input.placement_group }),
                ...(input.keywords !== undefined && { keywords: input.keywords }),
                ...(input.tracking_urls !== undefined && { tracking_urls: input.tracking_urls })
            },
            retries: 10
        });

        const providerTemplate = ProviderTargetingTemplateSchema.parse(response.data);

        return {
            id: providerTemplate.id,
            ...(providerTemplate.name !== undefined && { name: providerTemplate.name }),
            ...(providerTemplate.ad_account_id !== undefined && { ad_account_id: providerTemplate.ad_account_id }),
            ...(providerTemplate.targeting_attributes !== undefined && { targeting_attributes: providerTemplate.targeting_attributes }),
            ...(providerTemplate.status !== undefined && { status: providerTemplate.status }),
            ...(providerTemplate.created_time !== undefined && { created_time: providerTemplate.created_time }),
            ...(providerTemplate.updated_time !== undefined && { updated_time: providerTemplate.updated_time }),
            ...(providerTemplate.auto_targeting_enabled !== undefined && { auto_targeting_enabled: providerTemplate.auto_targeting_enabled })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
