import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const MatchTypeSchema = z.enum(['BROAD', 'PHRASE', 'EXACT', 'EXACT_NEGATIVE', 'PHRASE_NEGATIVE']);

const KeywordSchema = z.object({
    match_type: MatchTypeSchema,
    value: z.string()
});

const CreativeTypeSchema = z.enum(['REGULAR', 'VIDEO', 'SHOPPING', 'CAROUSEL', 'MAX_VIDEO', 'SHOP_THE_PIN', 'COLLECTION', 'IDEA']);

const PlacementGroupSchema = z.enum(['ALL', 'SEARCH', 'BROWSE', 'OTHER']);

const TargetingSpecSchema = z
    .object({
        AGE_BUCKET: z.array(z.string()).optional().nullable(),
        APPTYPE: z.array(z.string()).optional().nullable(),
        AUDIENCE_EXCLUDE: z.array(z.string()).optional().nullable(),
        AUDIENCE_INCLUDE: z.array(z.string()).optional().nullable(),
        GENDER: z.array(z.string()).optional().nullable(),
        GEO: z.array(z.string()).optional().nullable(),
        GEO_EXCLUDE: z.array(z.string()).optional(),
        INTEREST: z.array(z.string()).optional(),
        LOCALE: z.array(z.string()).optional().nullable(),
        LOCATION: z.array(z.string()).optional().nullable(),
        LOCATION_EXCLUDE: z.array(z.string()).optional(),
        MAXIMUM_AGE: z.string().optional(),
        MINIMUM_AGE: z.string().optional(),
        SHOPPING_RETARGETING: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
        TARGETING_STRATEGY: z.array(z.string()).optional().nullable()
    })
    .passthrough();

const InputSchema = z.object({
    ad_account_id: z.string().describe('Unique identifier of an ad account. Example: "549770573673"'),
    auto_targeting_enabled: z.boolean().optional().describe('Enable auto-targeting for ad group. Default true.'),
    creative_types: z.array(CreativeTypeSchema).optional().nullable().describe('Pin creative types filter.'),
    keywords: z.array(KeywordSchema).optional().nullable().describe('Array of keyword objects.'),
    placement_group: PlacementGroupSchema.optional().describe('Placement group. Default ALL.'),
    product_group_ids: z.array(z.string()).optional().nullable().describe('Targeted product group IDs.'),
    targeting_spec: TargetingSpecSchema.optional().nullable().describe('Ad group targeting specification.')
});

const OutputSchema = z.object({
    audience_size_lower_bound: z.number().optional().describe('The lower confidence bound of the estimated potential audience size.'),
    audience_size_upper_bound: z.number().optional().describe('The upper confidence bound of the estimated potential audience size.')
});

const action = createAction({
    description: 'Estimate reachable audience size for a targeting spec.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_groups/audience_sizing
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/ad_groups/audience_sizing`,
            data: {
                ...(input.auto_targeting_enabled !== undefined && { auto_targeting_enabled: input.auto_targeting_enabled }),
                ...(input.creative_types !== undefined && { creative_types: input.creative_types }),
                ...(input.keywords !== undefined && { keywords: input.keywords }),
                ...(input.placement_group !== undefined && { placement_group: input.placement_group }),
                ...(input.product_group_ids !== undefined && { product_group_ids: input.product_group_ids }),
                ...(input.targeting_spec !== undefined && { targeting_spec: input.targeting_spec })
            },
            retries: 3
        };

        const response = await nango.post(config);
        const providerResponse = OutputSchema.parse(response.data);

        return providerResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
