import { z } from 'zod';
import { createAction } from 'nango';

const PersonLookupSchema = z.object({
    id: z.string().optional().describe('Apollo person ID. Example: "64a7ff0cc4dfae00013df1a5"'),
    email: z.string().email().optional().describe('Email address to look up.'),
    first_name: z.string().optional().describe('First name for name-based lookup.'),
    last_name: z.string().optional().describe('Last name for name-based lookup.'),
    organization_name: z.string().optional().describe('Organization name for name-based lookup.'),
    linkedin_url: z.string().optional().describe('LinkedIn URL to look up.'),
    domain: z.string().optional().describe('Organization domain to look up.')
});

const InputSchema = z.object({
    details: z.array(PersonLookupSchema).min(1).max(10).describe('Array of person lookup details. Maximum 10 people per request.'),
    reveal_personal_emails: z.boolean().optional().describe('Whether to reveal personal email addresses in the response.'),
    reveal_phone_number: z.boolean().optional().describe('Whether to reveal phone numbers in the response.')
});

const EmploymentHistorySchema = z.object({
    id: z.string(),
    created_at: z.string().nullable().optional(),
    current: z.boolean().optional(),
    degree: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    emails: z.array(z.string()).nullable().optional(),
    end_date: z.string().nullable().optional(),
    grade_level: z.string().nullable().optional(),
    kind: z.string().nullable().optional(),
    major: z.string().nullable().optional(),
    org_matched_by_name: z.boolean().optional(),
    organization_id: z.string().optional(),
    organization_name: z.string().optional(),
    raw_address: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    title: z.string().optional(),
    updated_at: z.string().nullable().optional()
});

const ProviderPersonSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    name: z.string().optional(),
    linkedin_url: z.string().nullable().optional(),
    title: z.string().optional(),
    email_status: z.string().nullable().optional(),
    photo_url: z.string().nullable().optional(),
    twitter_url: z.string().nullable().optional(),
    github_url: z.string().nullable().optional(),
    facebook_url: z.string().nullable().optional(),
    extrapolated_email_confidence: z.number().nullable().optional(),
    headline: z.string().optional(),
    email: z.string().nullable().optional(),
    organization_id: z.string().optional(),
    employment_history: z.array(EmploymentHistorySchema).optional()
});

const ProviderResponseSchema = z.object({
    status: z.string(),
    error_code: z.string().nullable().optional(),
    error_message: z.string().nullable().optional(),
    total_requested_enrichments: z.number(),
    unique_enriched_records: z.number(),
    missing_records: z.number(),
    credits_consumed: z.number(),
    matches: z.array(ProviderPersonSchema.nullable())
});

const EnrichedPersonSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    name: z.string().optional(),
    linkedin_url: z.string().optional(),
    title: z.string().optional(),
    email_status: z.string().optional(),
    photo_url: z.string().optional(),
    email: z.string().optional(),
    organization_id: z.string().optional(),
    employment_history: z.array(EmploymentHistorySchema).optional()
});

const OutputSchema = z.object({
    status: z.string(),
    total_requested: z.number(),
    unique_enriched: z.number(),
    missing_records: z.number(),
    credits_consumed: z.number(),
    matches: z.array(EnrichedPersonSchema)
});

const action = createAction({
    description: 'Bulk enrich people by emails or IDs. Supports up to 10 people per request.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api_key'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.apollo.io/reference/bulk-people-enrichment
        const response = await nango.post({
            endpoint: '/v1/people/bulk_match',
            params: {
                ...(input.reveal_personal_emails !== undefined && { reveal_personal_emails: String(input.reveal_personal_emails) }),
                ...(input.reveal_phone_number !== undefined && { reveal_phone_number: String(input.reveal_phone_number) })
            },
            data: {
                details: input.details
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.status !== 'success') {
            throw new nango.ActionError({
                type: 'api_error',
                message: parsed.error_message || 'Bulk enrichment failed',
                error_code: parsed.error_code
            });
        }

        return {
            status: parsed.status,
            total_requested: parsed.total_requested_enrichments,
            unique_enriched: parsed.unique_enriched_records,
            missing_records: parsed.missing_records,
            credits_consumed: parsed.credits_consumed,
            matches: parsed.matches
                .filter((match): match is z.infer<typeof ProviderPersonSchema> => match !== null)
                .map((match) => ({
                    id: match.id,
                    ...(match.first_name !== undefined && { first_name: match.first_name }),
                    ...(match.last_name !== undefined && { last_name: match.last_name }),
                    ...(match.name !== undefined && { name: match.name }),
                    ...(match.linkedin_url != null && { linkedin_url: match.linkedin_url }),
                    ...(match.title !== undefined && { title: match.title }),
                    ...(match.email_status != null && { email_status: match.email_status }),
                    ...(match.photo_url != null && { photo_url: match.photo_url }),
                    ...(match.email != null && { email: match.email }),
                    ...(match.organization_id !== undefined && { organization_id: match.organization_id }),
                    ...(match.employment_history !== undefined && { employment_history: match.employment_history })
                }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
