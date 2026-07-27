import { z } from 'zod';
import { createAction } from 'nango';

const EducationEntrySchema = z.object({
    id: z.string().optional(),
    school: z.string(),
    degree: z.string().optional(),
    field_of_study: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional()
});

const ExperienceEntrySchema = z.object({
    id: z.string().optional(),
    title: z.string(),
    summary: z.string().optional(),
    company: z.string().optional(),
    industry: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    current: z.boolean().optional()
});

const SocialProfileSchema = z.object({
    type: z.string(),
    name: z.string().optional(),
    username: z.string().optional(),
    url: z.string()
});

const InputSchema = z.object({
    id: z.string().describe('The candidate ID. Example: "27273183"'),
    firstname: z.string().optional().describe("The candidate's first name"),
    lastname: z.string().optional().describe("The candidate's last name"),
    email: z.string().optional().describe("The candidate's email"),
    headline: z.string().optional().describe('One line description'),
    summary: z.string().optional().describe('The profile summary'),
    address: z.string().optional().describe("The candidate's address"),
    phone: z.string().optional().describe("The candidate's phone number"),
    texting_consent: z.string().optional().describe('Either forced or declined'),
    cover_letter: z.string().optional().describe("The candidate's cover letter"),
    resume_url: z.string().optional().describe("URL pointing to the candidate's resume"),
    image_url: z.string().optional().describe('Publicly accessible URL of the image'),
    image_source: z.string().optional().describe('Indicates where the photo came from'),
    education_entries: z.array(EducationEntrySchema).optional().describe('Full-replace list of education entries. Omit to leave unchanged; send [] to wipe.'),
    experience_entries: z
        .array(ExperienceEntrySchema)
        .optional()
        .describe('Full-replace list of experience entries. Omit to leave unchanged; send [] to wipe.'),
    skills: z.array(z.string()).optional().describe("The candidate's skills"),
    tags: z.array(z.string()).optional().describe('Full-replace list of tags. Omit to leave unchanged; send [] to wipe.'),
    social_profiles: z.array(SocialProfileSchema).optional().describe('Full-replace list of social profiles. Omit to leave unchanged; send [] to wipe.')
});

const ProviderCandidateSchema = z
    .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        firstname: z.string().nullable().optional(),
        lastname: z.string().nullable().optional(),
        headline: z.string().nullable().optional(),
        summary: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        cover_letter: z.string().nullable().optional(),
        education_entries: z.array(EducationEntrySchema.extend({})).optional(),
        experience_entries: z.array(ExperienceEntrySchema.extend({})).optional(),
        skills: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        social_profiles: z.array(SocialProfileSchema.extend({})).optional(),
        stage: z.string().nullable().optional(),
        stage_kind: z.string().nullable().optional(),
        disqualified: z.boolean().nullable().optional(),
        sourced: z.boolean().nullable().optional(),
        profile_url: z.string().nullable().optional(),
        created_at: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional(),
        resume_url: z.string().nullable().optional(),
        image_url: z.string().nullable().optional(),
        location: z
            .object({
                location_str: z.string().nullable().optional(),
                country: z.string().nullable().optional(),
                country_code: z.string().nullable().optional(),
                region: z.string().nullable().optional(),
                region_code: z.string().nullable().optional(),
                city: z.string().nullable().optional(),
                zip_code: z.string().nullable().optional()
            })
            .nullable()
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    headline: z.string().optional(),
    summary: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    cover_letter: z.string().optional(),
    education_entries: z.array(EducationEntrySchema.extend({})).optional(),
    experience_entries: z.array(ExperienceEntrySchema.extend({})).optional(),
    skills: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    social_profiles: z.array(SocialProfileSchema.extend({})).optional(),
    stage: z.string().optional(),
    stage_kind: z.string().optional(),
    disqualified: z.boolean().optional(),
    sourced: z.boolean().optional(),
    profile_url: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    resume_url: z.string().optional(),
    image_url: z.string().optional(),
    location: z
        .object({
            location_str: z.string().optional(),
            country: z.string().optional(),
            country_code: z.string().optional(),
            region: z.string().optional(),
            region_code: z.string().optional(),
            city: z.string().optional(),
            zip_code: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update candidate fields',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const candidateBody: Record<string, unknown> = {};

        if (input.firstname !== undefined) {
            candidateBody['firstname'] = input.firstname;
        }
        if (input.lastname !== undefined) {
            candidateBody['lastname'] = input.lastname;
        }
        if (input.email !== undefined) {
            candidateBody['email'] = input.email;
        }
        if (input.headline !== undefined) {
            candidateBody['headline'] = input.headline;
        }
        if (input.summary !== undefined) {
            candidateBody['summary'] = input.summary;
        }
        if (input.address !== undefined) {
            candidateBody['address'] = input.address;
        }
        if (input.phone !== undefined) {
            candidateBody['phone'] = input.phone;
        }
        if (input.texting_consent !== undefined) {
            candidateBody['texting_consent'] = input.texting_consent;
        }
        if (input.cover_letter !== undefined) {
            candidateBody['cover_letter'] = input.cover_letter;
        }
        if (input.resume_url !== undefined) {
            candidateBody['resume_url'] = input.resume_url;
        }
        if (input.image_url !== undefined) {
            candidateBody['image_url'] = input.image_url;
        }
        if (input.image_source !== undefined) {
            candidateBody['image_source'] = input.image_source;
        }
        if (input.education_entries !== undefined) {
            candidateBody['education_entries'] = input.education_entries;
        }
        if (input.experience_entries !== undefined) {
            candidateBody['experience_entries'] = input.experience_entries;
        }
        if (input.skills !== undefined) {
            candidateBody['skills'] = input.skills;
        }
        if (input.tags !== undefined) {
            candidateBody['tags'] = input.tags;
        }
        if (input.social_profiles !== undefined) {
            candidateBody['social_profiles'] = input.social_profiles;
        }

        // https://workable.readme.io/reference/update-candidate
        const response = await nango.patch({
            endpoint: `/spi/v3/candidates/${encodeURIComponent(input.id)}`,
            data: {
                candidate: candidateBody
            },
            retries: 3
        });

        const patchResponse = z.object({ candidate: ProviderCandidateSchema }).parse(response.data);
        const providerCandidate = patchResponse.candidate;

        return {
            id: providerCandidate.id,
            ...(providerCandidate.name != null && { name: providerCandidate.name }),
            ...(providerCandidate.firstname != null && { firstname: providerCandidate.firstname }),
            ...(providerCandidate.lastname != null && { lastname: providerCandidate.lastname }),
            ...(providerCandidate.headline != null && { headline: providerCandidate.headline }),
            ...(providerCandidate.summary != null && { summary: providerCandidate.summary }),
            ...(providerCandidate.address != null && { address: providerCandidate.address }),
            ...(providerCandidate.phone != null && { phone: providerCandidate.phone }),
            ...(providerCandidate.email != null && { email: providerCandidate.email }),
            ...(providerCandidate.cover_letter != null && { cover_letter: providerCandidate.cover_letter }),
            ...(providerCandidate.education_entries != null && { education_entries: providerCandidate.education_entries }),
            ...(providerCandidate.experience_entries != null && { experience_entries: providerCandidate.experience_entries }),
            ...(providerCandidate.skills != null && { skills: providerCandidate.skills }),
            ...(providerCandidate.tags != null && { tags: providerCandidate.tags }),
            ...(providerCandidate.social_profiles != null && { social_profiles: providerCandidate.social_profiles }),
            ...(providerCandidate.stage != null && { stage: providerCandidate.stage }),
            ...(providerCandidate.stage_kind != null && { stage_kind: providerCandidate.stage_kind }),
            ...(providerCandidate.disqualified != null && { disqualified: providerCandidate.disqualified }),
            ...(providerCandidate.sourced != null && { sourced: providerCandidate.sourced }),
            ...(providerCandidate.profile_url != null && { profile_url: providerCandidate.profile_url }),
            ...(providerCandidate.created_at != null && { created_at: providerCandidate.created_at }),
            ...(providerCandidate.updated_at != null && { updated_at: providerCandidate.updated_at }),
            ...(providerCandidate.resume_url != null && { resume_url: providerCandidate.resume_url }),
            ...(providerCandidate.image_url != null && { image_url: providerCandidate.image_url }),
            ...(providerCandidate.location != null && {
                location: {
                    ...(providerCandidate.location.location_str != null && { location_str: providerCandidate.location.location_str }),
                    ...(providerCandidate.location.country != null && { country: providerCandidate.location.country }),
                    ...(providerCandidate.location.country_code != null && { country_code: providerCandidate.location.country_code }),
                    ...(providerCandidate.location.region != null && { region: providerCandidate.location.region }),
                    ...(providerCandidate.location.region_code != null && { region_code: providerCandidate.location.region_code }),
                    ...(providerCandidate.location.city != null && { city: providerCandidate.location.city }),
                    ...(providerCandidate.location.zip_code != null && { zip_code: providerCandidate.location.zip_code })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
