import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    audience_id: z.string().describe('Audience ID. Example: "2542623499735"')
});

const AudienceRuleSchema = z
    .object({
        ad_account_id: z.string().optional(),
        ad_id: z.array(z.string()).optional(),
        campaign_id: z.array(z.string()).optional(),
        country: z.string().optional(),
        customer_list_id: z.string().optional(),
        engagement_domain: z.array(z.string()).optional(),
        engagement_type: z.string().optional(),
        engager_type: z.number().optional(),
        event: z.string().optional(),
        event_data: z.unknown().optional(),
        event_source: z.unknown().optional(),
        exclusion_days: z.number().optional(),
        exclusion_event_source: z.unknown().optional(),
        exclusion_filter: z.unknown().optional(),
        exclusion_window_days: z.number().optional(),
        frequency: z.number().optional(),
        gender: z.array(z.string()).optional(),
        ingestion_source: z.unknown().optional(),
        interest_ids: z.array(z.string()).optional(),
        locale: z.array(z.string()).optional(),
        min_engagement_frequency: z.number().optional(),
        retargeting_type: z.string().optional(),
        retention_days: z.number().optional(),
        seed_id: z.array(z.string()).optional(),
        start_date: z.string().optional(),
        url: z.array(z.string()).optional(),
        visitor_source_id: z.string().optional(),
        vsy_experiment: z.unknown().optional(),
        window_days: z.number().optional()
    })
    .passthrough();

const ProviderAudienceSchema = z.object({
    ad_account_id: z.string().optional(),
    audience_type: z.string().optional(),
    created_by_company_name: z.string().nullable().optional(),
    created_timestamp: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
    id: z.string(),
    is_nca: z.boolean().optional(),
    name: z.string().optional(),
    rule: AudienceRuleSchema.optional(),
    size: z.number().nullable().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    updated_timestamp: z.number().nullable().optional()
});

const OutputSchema = z.object({
    ad_account_id: z.string().optional(),
    audience_type: z.string().optional(),
    created_by_company_name: z.string().optional(),
    created_timestamp: z.number().optional(),
    description: z.string().optional(),
    id: z.string(),
    is_nca: z.boolean().optional(),
    name: z.string().optional(),
    rule: AudienceRuleSchema.optional(),
    size: z.number().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    updated_timestamp: z.number().optional()
});

const action = createAction({
    description: 'Retrieve an audience',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/audiences/get
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/audiences/${encodeURIComponent(input.audience_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Audience not found',
                ad_account_id: input.ad_account_id,
                audience_id: input.audience_id
            });
        }

        const providerAudience = ProviderAudienceSchema.parse(response.data);

        return {
            id: providerAudience.id,
            ...(providerAudience.ad_account_id !== undefined && { ad_account_id: providerAudience.ad_account_id }),
            ...(providerAudience.audience_type !== undefined && { audience_type: providerAudience.audience_type }),
            ...(providerAudience.created_by_company_name != null && { created_by_company_name: providerAudience.created_by_company_name }),
            ...(providerAudience.created_timestamp != null && { created_timestamp: providerAudience.created_timestamp }),
            ...(providerAudience.description != null && { description: providerAudience.description }),
            ...(providerAudience.is_nca !== undefined && { is_nca: providerAudience.is_nca }),
            ...(providerAudience.name !== undefined && { name: providerAudience.name }),
            ...(providerAudience.rule !== undefined && { rule: providerAudience.rule }),
            ...(providerAudience.size != null && { size: providerAudience.size }),
            ...(providerAudience.status !== undefined && { status: providerAudience.status }),
            ...(providerAudience.type !== undefined && { type: providerAudience.type }),
            ...(providerAudience.updated_timestamp != null && { updated_timestamp: providerAudience.updated_timestamp })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
