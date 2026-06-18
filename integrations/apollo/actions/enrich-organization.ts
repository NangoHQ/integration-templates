import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        domain: z
            .string()
            .optional()
            .describe('The domain of the company to enrich. Example: "apollo.io" or "microsoft.com". Do not include "www.", the "@" symbol, or similar.'),
        id: z.string().optional().describe('The Apollo ID of the organization to enrich. Example: "5e66b6381e05b4008c8331b8"')
    })
    .refine((data) => data.domain || data.id, {
        message: 'Either domain or id must be provided',
        path: ['domain']
    });

const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    website_url: z.string().nullable().optional(),
    blog_url: z.string().nullable().optional(),
    angellist_url: z.string().nullable().optional(),
    linkedin_url: z.string().nullable().optional(),
    twitter_url: z.string().nullable().optional(),
    facebook_url: z.string().nullable().optional(),
    primary_phone: z.unknown().nullable().optional(),
    languages: z.array(z.string()).optional(),
    alexa_ranking: z.number().nullable().optional(),
    phone: z.string().nullable().optional(),
    linkedin_uid: z.string().nullable().optional(),
    founded_year: z.number().nullable().optional(),
    publicly_traded_symbol: z.string().nullable().optional(),
    publicly_traded_exchange: z.string().nullable().optional(),
    logo_url: z.string().nullable().optional(),
    crunchbase_url: z.string().nullable().optional(),
    primary_domain: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    keywords: z.array(z.string()).optional(),
    estimated_num_employees: z.number().nullable().optional(),
    industry_tag_id: z.string().nullable().optional(),
    industry_tag_hash: z.record(z.string(), z.unknown()).nullable().optional(),
    retail_location_count: z.number().nullable().optional(),
    raw_address: z.string().nullable().optional(),
    street_address: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional(),
    owned_by_organization_id: z.string().nullable().optional(),
    owned_by_organization: z.unknown().nullable().optional(),
    num_organizations_owned: z.number().nullable().optional(),
    num_subsidiaries: z.number().nullable().optional(),
    total_funding: z.number().nullable().optional(),
    total_funding_printed: z.string().nullable().optional(),
    latest_funding_round_date: z.string().nullable().optional(),
    latest_funding_stage: z.string().nullable().optional(),
    funding_events: z.array(z.unknown()).optional(),
    intent_strength: z.number().nullable().optional(),
    intent_topic: z.string().nullable().optional(),
    intent_signal_score: z.number().nullable().optional(),
    intent_score_normalized: z.number().nullable().optional(),
    intent_score_bucket: z.string().nullable().optional(),
    intent_surge_from: z.string().nullable().optional(),
    intent_surge_to: z.string().nullable().optional(),
    sic_codes: z.array(z.string()).optional(),
    naics_codes: z.array(z.string()).optional(),
    technology_names: z.array(z.string()).optional(),
    technology_categories: z.array(z.string()).optional(),
    short_description: z.string().nullable().optional(),
    seo_description: z.string().nullable().optional(),
    annual_revenue_printed: z.string().nullable().optional(),
    annual_revenue: z.number().nullable().optional(),
    department_head_count: z.record(z.string(), z.number()).nullable().optional()
});

const OutputSchema = z.object({
    organization: OrganizationSchema.optional()
});

const action = createAction({
    description: 'Enrich an organization by domain or Apollo ID',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.domain) {
            params['domain'] = input.domain;
        }
        if (input.id) {
            params['id'] = input.id;
        }

        const response = await nango.get({
            // https://docs.apollo.io/reference/organization-enrichment
            endpoint: '/v1/organizations/enrich',
            params: params,
            retries: 3
        });

        const data = z
            .object({
                organization: z.unknown().optional()
            })
            .parse(response.data);

        if (!data.organization) {
            return { organization: undefined };
        }

        const organization = OrganizationSchema.parse(data.organization);

        return {
            organization: organization
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
