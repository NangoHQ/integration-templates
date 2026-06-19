import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique id of the candidate to retrieve. Example: "f9e52a51-a075-4116-a7b8-484deba69004"')
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

const FileHandleSchema = z.object({
    id: z.string(),
    name: z.string(),
    handle: z.string()
});

const LocationComponentSchema = z.object({
    type: z.enum(['Country', 'Region', 'City']),
    name: z.string()
});

const LocationSchema = z.object({
    id: z.string(),
    locationSummary: z.string(),
    locationComponents: z.array(LocationComponentSchema)
});

const CandidateSchema = z
    .object({
        id: z.string(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
        name: z.string(),
        primaryEmailAddress: EmailAddressSchema.nullable().optional(),
        emailAddresses: z.array(EmailAddressSchema),
        primaryPhoneNumber: PhoneNumberSchema.nullable().optional(),
        phoneNumbers: z.array(PhoneNumberSchema),
        socialLinks: z.array(SocialLinkSchema),
        tags: z.array(z.record(z.string(), z.unknown())),
        position: z.string().nullable().optional(),
        company: z.string().nullable().optional(),
        school: z.string().nullable().optional(),
        applicationIds: z.array(z.string()),
        resumeFileHandle: FileHandleSchema.nullable().optional(),
        fileHandles: z.array(FileHandleSchema),
        customFields: z.array(z.record(z.string(), z.unknown())),
        profileUrl: z.string(),
        source: z.record(z.string(), z.unknown()).nullable().optional(),
        creditedToUser: z.record(z.string(), z.unknown()).nullable().optional(),
        timezone: z.string().nullable().optional(),
        location: LocationSchema.nullable().optional(),
        fraudStatus: z.enum(['Fraudulent', 'NotFraudulent', 'Unsure', 'Unreviewed', 'PassedFraudCheck']).nullable().optional()
    })
    .passthrough();

const OutputSchema = CandidateSchema;

const action = createAction({
    description: 'Retrieve a single candidate from Ashby.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['candidatesRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/candidateinfo
            endpoint: 'candidate.info',
            data: {
                id: input.id
            },
            retries: 3
        });

        const candidate = CandidateSchema.parse(response.data.results);

        return candidate;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
