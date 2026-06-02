import { z } from 'zod';
import { createAction } from 'nango';

const LocationInputSchema = z.object({
    city: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional()
});

const InputSchema = z.object({
    name: z.string().describe('The first and last name of the candidate to be created.'),
    email: z.string().optional().describe('Primary, personal email of the candidate to be created.'),
    phoneNumber: z.string().optional().describe('Primary, personal phone number of the candidate to be created.'),
    linkedInUrl: z.string().optional().describe("Url to the candidate's LinkedIn profile."),
    githubUrl: z.string().optional().describe("Url to the candidate's Github profile."),
    website: z.string().optional().describe("Url of the candidate's website."),
    alternateEmailAddresses: z.array(z.string()).optional().describe('Array of alternate email addresses to add to the candidate profile.'),
    sourceId: z.string().optional().describe('The source to set on the candidate being created.'),
    creditedToUserId: z.string().optional().describe('The id of the user the candidate will be credited to.'),
    location: LocationInputSchema.optional().describe('The location of the candidate.'),
    createdAt: z.string().optional().describe("An ISO date string to set the candidate's createdAt timestamp.")
});

const EmailAddressSchema = z.object({
    value: z.string(),
    type: z.string(),
    isPrimary: z.boolean()
});

const PhoneNumberSchema = z.object({
    value: z.string(),
    type: z.string(),
    isPrimary: z.boolean()
});

const SocialLinkSchema = z.object({
    type: z.string(),
    url: z.string()
});

const TagSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional()
});

const SourceSchema = z.object({
    id: z.string(),
    name: z.string(),
    isArchived: z.boolean().optional()
});

const UserSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional()
});

const LocationComponentSchema = z.object({
    type: z.string(),
    name: z.string()
});

const LocationSchema = z.object({
    id: z.string(),
    locationSummary: z.string(),
    locationComponents: z.array(LocationComponentSchema)
});

const CandidateSchema = z.object({
    id: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    name: z.string(),
    primaryEmailAddress: EmailAddressSchema.nullable().optional(),
    emailAddresses: z.array(EmailAddressSchema).optional(),
    primaryPhoneNumber: PhoneNumberSchema.nullable().optional(),
    phoneNumbers: z.array(PhoneNumberSchema).optional(),
    socialLinks: z.array(SocialLinkSchema).optional(),
    tags: z.array(TagSchema).optional(),
    position: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    school: z.string().nullable().optional(),
    applicationIds: z.array(z.string()).optional(),
    profileUrl: z.string().optional(),
    source: SourceSchema.nullable().optional(),
    creditedToUser: UserSchema.nullable().optional(),
    timezone: z.string().nullable().optional(),
    location: LocationSchema.nullable().optional(),
    fraudStatus: z.string().nullable().optional()
});

const ApiResponseSchema = z.object({
    success: z.boolean(),
    results: CandidateSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
    linkedInUrl: z.string().optional(),
    githubUrl: z.string().optional(),
    website: z.string().optional(),
    profileUrl: z.string().optional(),
    sourceId: z.string().optional(),
    creditedToUserId: z.string().optional(),
    location: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Create a candidate in Ashby.',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-candidate',
        group: 'Candidates'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['candidatesWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/candidatecreate
            endpoint: 'candidate.create',
            data: {
                name: input.name,
                ...(input.email !== undefined && { email: input.email }),
                ...(input.phoneNumber !== undefined && { phoneNumber: input.phoneNumber }),
                ...(input.linkedInUrl !== undefined && { linkedInUrl: input.linkedInUrl }),
                ...(input.githubUrl !== undefined && { githubUrl: input.githubUrl }),
                ...(input.website !== undefined && { website: input.website }),
                ...(input.alternateEmailAddresses !== undefined && { alternateEmailAddresses: input.alternateEmailAddresses }),
                ...(input.sourceId !== undefined && { sourceId: input.sourceId }),
                ...(input.creditedToUserId !== undefined && { creditedToUserId: input.creditedToUserId }),
                ...(input.location !== undefined && { location: input.location }),
                ...(input.createdAt !== undefined && { createdAt: input.createdAt })
            },
            retries: 3
        });

        const parsed = ApiResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The API response could not be parsed.',
                details: parsed.error.message
            });
        }

        if (!parsed.data.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'The Ashby API reported a failure.'
            });
        }

        const candidate = parsed.data.results;
        const linkedInUrl = candidate.socialLinks?.find((link) => link.type === 'LinkedIn')?.url;
        const githubUrl = candidate.socialLinks?.find((link) => link.type === 'GitHub')?.url;
        const websiteUrl = candidate.socialLinks?.find((link) => link.type === 'Website')?.url;

        return {
            id: candidate.id,
            name: candidate.name,
            ...(candidate.primaryEmailAddress != null && candidate.primaryEmailAddress.value && { email: candidate.primaryEmailAddress.value }),
            ...(candidate.primaryPhoneNumber != null && candidate.primaryPhoneNumber.value && { phoneNumber: candidate.primaryPhoneNumber.value }),
            ...(linkedInUrl && { linkedInUrl }),
            ...(githubUrl && { githubUrl }),
            ...(websiteUrl && { website: websiteUrl }),
            ...(candidate.profileUrl && { profileUrl: candidate.profileUrl }),
            ...(candidate.source != null && candidate.source.id && { sourceId: candidate.source.id }),
            ...(candidate.creditedToUser != null && candidate.creditedToUser.id && { creditedToUserId: candidate.creditedToUser.id }),
            ...(candidate.location != null && candidate.location.locationSummary && { location: candidate.location.locationSummary }),
            ...(candidate.createdAt && { createdAt: candidate.createdAt }),
            ...(candidate.updatedAt && { updatedAt: candidate.updatedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
