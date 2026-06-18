import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const SocialLinkSchema = z.object({
    type: z.enum(['LinkedIn', 'GitHub', 'Twitter', 'Medium', 'StackOverflow', 'YouTube', 'CodePen', 'Website']),
    url: z.string()
});

const InputSchema = z.object({
    candidateId: z.string().describe('The unique id of the candidate to update. Example: "f9e52a51-a075-4116-a7b8-484deba69004"'),
    name: z.string().optional().describe('The first and last name of the candidate to update.'),
    email: z.string().optional().describe('Primary, personal email of the candidate to update.'),
    phoneNumber: z.string().optional().describe('Primary, personal phone number of the candidate to update.'),
    linkedInUrl: z.string().optional().describe("Url to the candidate's LinkedIn profile."),
    githubUrl: z.string().optional().describe("Url to the candidate's Github profile."),
    websiteUrl: z.string().optional().describe("Url of the candidate's website."),
    alternateEmail: z.string().optional().describe("An alternate email address to add to the candidate's profile."),
    socialLinks: z.array(SocialLinkSchema).optional().describe('An array of social links to set on the candidate.'),
    sourceId: z.string().optional().describe('The id of source for this candidate.'),
    creditedToUserId: z.string().optional().describe('The id of the user the candidate will be credited to.'),
    location: z
        .object({
            city: z.string().optional(),
            region: z.string().optional(),
            country: z.string().optional()
        })
        .optional()
        .describe('The location of the candidate.'),
    createdAt: z.string().optional().describe("An ISO date string to set the candidate's createdAt timestamp."),
    sendNotifications: z
        .boolean()
        .optional()
        .describe('Whether or not users who are subscribed to the candidate should be notified that candidate was updated.')
});

const ProviderContactInfoSchema = z.object({
    value: z.string(),
    type: z.string().optional(),
    isPrimary: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean().optional(),
    errors: z.union([z.string(), z.array(z.string())]).optional(),
    results: z.unknown().optional()
});

const ProviderCandidateSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    primaryEmailAddress: ProviderContactInfoSchema.nullable().optional(),
    emailAddresses: z.array(ProviderContactInfoSchema).optional(),
    primaryPhoneNumber: ProviderContactInfoSchema.nullable().optional(),
    phoneNumbers: z.array(ProviderContactInfoSchema).optional(),
    socialLinks: z.array(SocialLinkSchema).optional(),
    tags: z.array(z.object({ id: z.string(), name: z.string().optional() })).optional(),
    position: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    school: z.string().nullable().optional(),
    applicationIds: z.array(z.string()).optional(),
    fileHandles: z.array(z.object({ id: z.string(), name: z.string(), handle: z.string() })).optional(),
    customFields: z.array(z.unknown()).optional(),
    profileUrl: z.string().optional(),
    source: z.object({ id: z.string(), name: z.string().optional(), title: z.string().optional() }).nullable().optional(),
    creditedToUser: z.object({ id: z.string(), name: z.string().optional() }).nullable().optional(),
    timezone: z.string().nullable().optional(),
    location: z
        .object({
            id: z.string().optional(),
            locationSummary: z.string().optional(),
            locationComponents: z.array(z.object({ type: z.string(), name: z.string() })).optional()
        })
        .nullable()
        .optional(),
    fraudStatus: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    primaryEmailAddress: z.string().optional(),
    primaryPhoneNumber: z.string().optional(),
    position: z.string().optional(),
    company: z.string().optional(),
    school: z.string().optional(),
    profileUrl: z.string().optional(),
    timezone: z.string().optional(),
    location: z.string().optional(),
    source: z.string().optional(),
    creditedToUser: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Update a candidate in Ashby.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['candidatesWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/candidateupdate
            endpoint: '/candidate.update',
            data: {
                candidateId: input.candidateId,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.phoneNumber !== undefined && { phoneNumber: input.phoneNumber }),
                ...(input.linkedInUrl !== undefined && { linkedInUrl: input.linkedInUrl }),
                ...(input.githubUrl !== undefined && { githubUrl: input.githubUrl }),
                ...(input.websiteUrl !== undefined && { websiteUrl: input.websiteUrl }),
                ...(input.alternateEmail !== undefined && { alternateEmail: input.alternateEmail }),
                ...(input.socialLinks !== undefined && { socialLinks: input.socialLinks }),
                ...(input.sourceId !== undefined && { sourceId: input.sourceId }),
                ...(input.creditedToUserId !== undefined && { creditedToUserId: input.creditedToUserId }),
                ...(input.location !== undefined && { location: input.location }),
                ...(input.createdAt !== undefined && { createdAt: input.createdAt }),
                ...(input.sendNotifications !== undefined && { sendNotifications: input.sendNotifications })
            },
            retries: 3
        };

        const response = await nango.post(config);

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        if (parsedResponse.success === false) {
            throw new nango.ActionError({
                type: 'api_error',
                message: typeof parsedResponse.errors === 'string' ? parsedResponse.errors : 'Ashby API returned an error'
            });
        }

        if (!parsedResponse.results || typeof parsedResponse.results !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Ashby API'
            });
        }

        const providerCandidate = ProviderCandidateSchema.parse(parsedResponse.results);

        return {
            id: providerCandidate.id,
            ...(providerCandidate.name != null && { name: providerCandidate.name }),
            ...(providerCandidate.primaryEmailAddress != null && {
                primaryEmailAddress: providerCandidate.primaryEmailAddress.value
            }),
            ...(providerCandidate.primaryPhoneNumber != null && {
                primaryPhoneNumber: providerCandidate.primaryPhoneNumber.value
            }),
            ...(providerCandidate.position != null && { position: providerCandidate.position }),
            ...(providerCandidate.company != null && { company: providerCandidate.company }),
            ...(providerCandidate.school != null && { school: providerCandidate.school }),
            ...(providerCandidate.profileUrl != null && { profileUrl: providerCandidate.profileUrl }),
            ...(providerCandidate.timezone != null && { timezone: providerCandidate.timezone }),
            ...(providerCandidate.location != null && {
                location: providerCandidate.location.locationSummary
            }),
            ...(providerCandidate.source != null && {
                source: providerCandidate.source.name ?? providerCandidate.source.title
            }),
            ...(providerCandidate.creditedToUser != null && {
                creditedToUser: providerCandidate.creditedToUser.name
            }),
            ...(providerCandidate.createdAt != null && { createdAt: providerCandidate.createdAt }),
            ...(providerCandidate.updatedAt != null && { updatedAt: providerCandidate.updatedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
