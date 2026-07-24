import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Candidate ID. Example: "27273038"')
});

const AccountSchema = z.object({
    subdomain: z.string(),
    name: z.string()
});

const JobSchema = z.object({
    shortcode: z.string(),
    title: z.string()
});

const EducationEntrySchema = z.object({
    id: z.string(),
    degree: z.string().optional().nullable(),
    school: z.string().optional().nullable(),
    field_of_study: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable()
});

const ExperienceEntrySchema = z.object({
    id: z.string(),
    title: z.string().optional().nullable(),
    summary: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    industry: z.string().optional().nullable(),
    current: z.boolean().optional().nullable()
});

const SkillSchema = z.object({
    name: z.string()
});

const SocialProfileSchema = z.object({
    type: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    username: z.string().optional().nullable(),
    url: z.string().optional().nullable()
});

const LocationSchema = z.object({
    location_str: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    country_code: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    region_code: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    zip_code: z.string().optional().nullable()
});

const ResumeMetadataSchema = z.object({
    filename: z.string().optional().nullable(),
    filetype: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
});

const CandidateSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    firstname: z.string().optional().nullable(),
    lastname: z.string().optional().nullable(),
    headline: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    account: AccountSchema.optional(),
    job: JobSchema.optional(),
    stage: z.string().optional().nullable(),
    stage_kind: z.string().optional().nullable(),
    disqualified: z.boolean().optional().nullable(),
    withdrew: z.boolean().optional().nullable(),
    disqualified_at: z.string().optional().nullable(),
    disqualification_reason: z.string().optional().nullable(),
    sourced: z.boolean().optional().nullable(),
    profile_url: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    outbound_mailbox: z.string().optional().nullable(),
    domain: z.string().optional().nullable(),
    uploader_id: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    cover_letter: z.string().optional().nullable(),
    summary: z.string().optional().nullable(),
    education_entries: z.array(EducationEntrySchema).optional(),
    experience_entries: z.array(ExperienceEntrySchema).optional(),
    skills: z.array(SkillSchema).optional(),
    answers: z.array(z.unknown()).optional(),
    resume_url: z.string().optional().nullable(),
    resume_metadata: ResumeMetadataSchema.optional().nullable(),
    social_profiles: z.array(SocialProfileSchema).optional(),
    tags: z.array(z.string()).optional(),
    hired_at: z.string().optional().nullable(),
    location: LocationSchema.optional().nullable(),
    originating_candidate_id: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    candidate: CandidateSchema
});

const action = createAction({
    description: 'Retrieve full candidate details by id',
    version: '1.0.0',
    input: InputSchema,
    output: CandidateSchema,
    scopes: ['r_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof CandidateSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/job-candidates-show
            endpoint: `/spi/v3/candidates/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Candidate not found',
                candidate_id: input.id
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        return parsed.candidate;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
