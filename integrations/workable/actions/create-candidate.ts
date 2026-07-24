import { z } from 'zod';
import { createAction } from 'nango';

const EducationEntrySchema = z.object({
    school: z.string(),
    degree: z.string().optional(),
    field_of_study: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional()
});

const ExperienceEntrySchema = z.object({
    title: z.string(),
    company: z.string().optional(),
    industry: z.string().optional(),
    summary: z.string().optional(),
    current: z.boolean().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional()
});

const AnswerSchema = z.object({
    question_key: z.string(),
    answer: z.string().optional()
});

const ResumeSchema = z.object({
    name: z.string(),
    data: z.string()
});

const SocialProfileSchema = z.object({
    type: z.string(),
    url: z.string(),
    username: z.string()
});

const CandidateInputSchema = z.object({
    firstname: z.string(),
    lastname: z.string(),
    email: z.string(),
    name: z.string().optional(),
    headline: z.string().optional(),
    summary: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    cover_letter: z.string().optional(),
    education_entries: z.array(EducationEntrySchema).optional(),
    experience_entries: z.array(ExperienceEntrySchema).optional(),
    answers: z.array(AnswerSchema).optional(),
    skills: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    resume_url: z.string().optional(),
    resume: ResumeSchema.optional(),
    social_profiles: z.array(SocialProfileSchema).optional()
});

const InputSchema = z.object({
    shortcode: z.string().describe('Job shortcode. Example: "9CD658E13E"'),
    sourced: z.boolean().optional().describe('Whether the candidate is sourced. Defaults to true; false triggers an application email.'),
    candidate: CandidateInputSchema
});

const ProviderCandidateSchema = z
    .object({
        id: z.string(),
        name: z.string().nullish(),
        firstname: z.string().nullish(),
        lastname: z.string().nullish(),
        email: z.string().nullish(),
        headline: z.string().nullish(),
        summary: z.string().nullish(),
        address: z.string().nullish(),
        phone: z.string().nullish(),
        cover_letter: z.string().nullish(),
        education_entries: z.array(z.object({}).passthrough()).nullish(),
        experience_entries: z.array(z.object({}).passthrough()).nullish(),
        answers: z.array(z.object({}).passthrough()).nullish(),
        skills: z.array(z.string()).nullish(),
        tags: z.array(z.string()).nullish(),
        social_profiles: z.array(z.object({}).passthrough()).nullish()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    status: z.string(),
    candidate: ProviderCandidateSchema
});

const OutputSchema = z.object({
    status: z.string(),
    candidate: ProviderCandidateSchema
});

const action = createAction({
    description: 'Create a candidate at a specific job.',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_candidates', 'w_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            ...(input.sourced !== undefined && { sourced: input.sourced }),
            candidate: {
                firstname: input.candidate.firstname,
                lastname: input.candidate.lastname,
                email: input.candidate.email,
                ...(input.candidate.name !== undefined && { name: input.candidate.name }),
                ...(input.candidate.headline !== undefined && { headline: input.candidate.headline }),
                ...(input.candidate.summary !== undefined && { summary: input.candidate.summary }),
                ...(input.candidate.address !== undefined && { address: input.candidate.address }),
                ...(input.candidate.phone !== undefined && { phone: input.candidate.phone }),
                ...(input.candidate.cover_letter !== undefined && { cover_letter: input.candidate.cover_letter }),
                ...(input.candidate.education_entries !== undefined && { education_entries: input.candidate.education_entries }),
                ...(input.candidate.experience_entries !== undefined && { experience_entries: input.candidate.experience_entries }),
                ...(input.candidate.answers !== undefined && { answers: input.candidate.answers }),
                ...(input.candidate.skills !== undefined && { skills: input.candidate.skills }),
                ...(input.candidate.tags !== undefined && { tags: input.candidate.tags }),
                ...(input.candidate.resume_url !== undefined && { resume_url: input.candidate.resume_url }),
                ...(input.candidate.resume !== undefined && { resume: input.candidate.resume }),
                ...(input.candidate.social_profiles !== undefined && { social_profiles: input.candidate.social_profiles })
            }
        };

        // https://workable.readme.io/reference/create_candidate
        const response = await nango.post({
            endpoint: `/spi/v3/jobs/${encodeURIComponent(input.shortcode)}/candidates`,
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            status: providerResponse.status,
            candidate: providerResponse.candidate
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
