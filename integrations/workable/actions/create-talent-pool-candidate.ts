import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sourced: z.boolean().optional(),
    candidate: z.object({
        name: z.string().optional(),
        firstname: z.string().optional(),
        lastname: z.string().optional(),
        email: z.string(),
        headline: z.string().optional(),
        summary: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        cover_letter: z.string().optional(),
        education_entries: z
            .array(
                z.object({
                    school: z.string(),
                    degree: z.string().optional(),
                    field_of_study: z.string().optional(),
                    start_date: z.string().optional(),
                    end_date: z.string().optional()
                })
            )
            .optional(),
        experience_entries: z
            .array(
                z.object({
                    title: z.string(),
                    summary: z.string().optional(),
                    company: z.string().optional(),
                    industry: z.string().optional(),
                    start_date: z.string().optional(),
                    end_date: z.string().optional(),
                    current: z.boolean().optional()
                })
            )
            .optional(),
        skills: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        disqualified: z.boolean().optional(),
        disqualification_reason: z.string().optional(),
        disqualified_at: z.string().optional(),
        social_profiles: z
            .array(
                z.object({
                    type: z.string(),
                    username: z.string().optional(),
                    url: z.string()
                })
            )
            .optional(),
        domain: z.string().optional(),
        recruiter_key: z.string().optional(),
        resume_url: z.string().optional(),
        resume: z
            .object({
                name: z.string(),
                data: z.string()
            })
            .optional(),
        image_url: z.string().optional(),
        image: z
            .object({
                name: z.string(),
                data: z.string()
            })
            .optional(),
        image_source: z.string().optional()
    })
});

const ProviderCandidateSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    headline: z.string().nullable().optional(),
    account: z
        .object({
            subdomain: z.string(),
            name: z.string()
        })
        .optional(),
    talent_pool: z
        .object({
            talent_pool_id: z.union([z.string(), z.number()]),
            identifier: z.union([z.string(), z.number()])
        })
        .optional(),
    stage: z.string().optional(),
    disqualified: z.boolean().optional(),
    disqualified_at: z.string().nullable().optional(),
    disqualification_reason: z.string().nullable().optional(),
    sourced: z.boolean().optional(),
    profile_url: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    outbound_mailbox: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    uploader_id: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    cover_letter: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    education_entries: z
        .array(
            z.object({
                id: z.string().optional(),
                degree: z.string().nullable().optional(),
                school: z.string().nullable().optional(),
                field_of_study: z.string().nullable().optional(),
                start_date: z.string().nullable().optional(),
                end_date: z.string().nullable().optional()
            })
        )
        .nullable()
        .optional(),
    experience_entries: z
        .array(
            z.object({
                id: z.string().optional(),
                title: z.string().nullable().optional(),
                summary: z.string().nullable().optional(),
                start_date: z.string().nullable().optional(),
                end_date: z.string().nullable().optional(),
                company: z.string().nullable().optional(),
                industry: z.string().nullable().optional(),
                current: z.boolean().nullable().optional()
            })
        )
        .nullable()
        .optional(),
    skills: z
        .array(
            z.object({
                name: z.string()
            })
        )
        .nullable()
        .optional(),
    resume_url: z.string().nullable().optional(),
    social_profiles: z
        .array(
            z.object({
                type: z.string(),
                username: z.string().nullable().optional(),
                url: z.string()
            })
        )
        .nullable()
        .optional(),
    tags: z.array(z.string()).nullable().optional()
});

const ProviderResponseSchema = z.object({
    status: z.string(),
    candidate: ProviderCandidateSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    headline: z.string().optional(),
    account_subdomain: z.string().optional(),
    account_name: z.string().optional(),
    talent_pool_id: z.string().optional(),
    talent_pool_identifier: z.string().optional(),
    stage: z.string().optional(),
    disqualified: z.boolean().optional(),
    disqualified_at: z.string().optional(),
    disqualification_reason: z.string().optional(),
    sourced: z.boolean().optional(),
    profile_url: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    outbound_mailbox: z.string().optional(),
    domain: z.string().optional(),
    uploader_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    cover_letter: z.string().optional(),
    summary: z.string().optional(),
    education_entries: z
        .array(
            z.object({
                id: z.string().optional(),
                degree: z.string().optional(),
                school: z.string().optional(),
                field_of_study: z.string().optional(),
                start_date: z.string().optional(),
                end_date: z.string().optional()
            })
        )
        .optional(),
    experience_entries: z
        .array(
            z.object({
                id: z.string().optional(),
                title: z.string().optional(),
                summary: z.string().optional(),
                start_date: z.string().optional(),
                end_date: z.string().optional(),
                company: z.string().optional(),
                industry: z.string().optional(),
                current: z.boolean().optional()
            })
        )
        .optional(),
    skills: z.array(z.string()).optional(),
    resume_url: z.string().optional(),
    social_profiles: z
        .array(
            z.object({
                type: z.string(),
                username: z.string().optional(),
                url: z.string()
            })
        )
        .optional(),
    tags: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Create a candidate directly in the account talent pool (not tied to any job).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://workable.readme.io/reference/talent-pool-candidates-create
            endpoint: '/spi/v3/talent_pool/candidates',
            data: {
                ...(input.sourced !== undefined && { sourced: input.sourced }),
                candidate: input.candidate
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const candidate = providerResponse.candidate;

        return {
            id: candidate.id,
            ...(candidate.name != null && { name: candidate.name }),
            ...(candidate.firstname != null && { firstname: candidate.firstname }),
            ...(candidate.lastname != null && { lastname: candidate.lastname }),
            ...(candidate.headline != null && { headline: candidate.headline }),
            ...(candidate.account != null && {
                account_subdomain: candidate.account.subdomain,
                account_name: candidate.account.name
            }),
            ...(candidate.talent_pool != null && {
                talent_pool_id: String(candidate.talent_pool.talent_pool_id),
                talent_pool_identifier: String(candidate.talent_pool.identifier)
            }),
            ...(candidate.stage != null && { stage: candidate.stage }),
            ...(candidate.disqualified != null && { disqualified: candidate.disqualified }),
            ...(candidate.disqualified_at != null && { disqualified_at: candidate.disqualified_at }),
            ...(candidate.disqualification_reason != null && {
                disqualification_reason: candidate.disqualification_reason
            }),
            ...(candidate.sourced != null && { sourced: candidate.sourced }),
            ...(candidate.profile_url != null && { profile_url: candidate.profile_url }),
            ...(candidate.address != null && { address: candidate.address }),
            ...(candidate.phone != null && { phone: candidate.phone }),
            ...(candidate.email != null && { email: candidate.email }),
            ...(candidate.outbound_mailbox != null && { outbound_mailbox: candidate.outbound_mailbox }),
            ...(candidate.domain != null && { domain: candidate.domain }),
            ...(candidate.uploader_id != null && { uploader_id: candidate.uploader_id }),
            ...(candidate.created_at != null && { created_at: candidate.created_at }),
            ...(candidate.updated_at != null && { updated_at: candidate.updated_at }),
            ...(candidate.cover_letter != null && { cover_letter: candidate.cover_letter }),
            ...(candidate.summary != null && { summary: candidate.summary }),
            ...(candidate.education_entries != null && {
                education_entries: candidate.education_entries.map((entry) => ({
                    ...(entry.id != null && { id: entry.id }),
                    ...(entry.degree != null && { degree: entry.degree }),
                    ...(entry.school != null && { school: entry.school }),
                    ...(entry.field_of_study != null && { field_of_study: entry.field_of_study }),
                    ...(entry.start_date != null && { start_date: entry.start_date }),
                    ...(entry.end_date != null && { end_date: entry.end_date })
                }))
            }),
            ...(candidate.experience_entries != null && {
                experience_entries: candidate.experience_entries.map((entry) => ({
                    ...(entry.id != null && { id: entry.id }),
                    ...(entry.title != null && { title: entry.title }),
                    ...(entry.summary != null && { summary: entry.summary }),
                    ...(entry.start_date != null && { start_date: entry.start_date }),
                    ...(entry.end_date != null && { end_date: entry.end_date }),
                    ...(entry.company != null && { company: entry.company }),
                    ...(entry.industry != null && { industry: entry.industry }),
                    ...(entry.current != null && { current: entry.current })
                }))
            }),
            ...(candidate.skills != null && {
                skills: candidate.skills.map((skill) => skill.name)
            }),
            ...(candidate.resume_url != null && { resume_url: candidate.resume_url }),
            ...(candidate.social_profiles != null && {
                social_profiles: candidate.social_profiles.map((profile) => ({
                    type: profile.type,
                    ...(profile.username != null && { username: profile.username }),
                    url: profile.url
                }))
            }),
            ...(candidate.tags != null && { tags: candidate.tags })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
