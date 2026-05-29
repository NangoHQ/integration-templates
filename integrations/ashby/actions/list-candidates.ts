import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('The maximum number of items to return. The maximum and default value is 100.'),
    createdAfter: z.number().int().optional().describe('The API will return data after this date, which is the time since the unix epoch in milliseconds.'),
    syncToken: z.string().optional().describe('An opaque token representing the last time the data was successfully synced from the API.')
});

const ProviderCandidateSchema = z
    .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        createdAt: z.string().nullable().optional(),
        updatedAt: z.string().nullable().optional(),
        primaryEmailAddress: z.unknown().nullable().optional(),
        emailAddresses: z
            .array(z.object({ value: z.string() }).passthrough())
            .nullable()
            .optional(),
        phoneNumbers: z.array(z.unknown()).nullable().optional(),
        socialLinks: z.array(z.unknown()).nullable().optional(),
        tags: z.array(z.unknown()).nullable().optional(),
        applicationIds: z.array(z.string()).nullable().optional(),
        fileHandles: z.array(z.unknown()).nullable().optional(),
        customFields: z.array(z.unknown()).nullable().optional(),
        profileUrl: z.string().nullable().optional(),
        source: z.unknown().nullable().optional(),
        creditedToUser: z.unknown().nullable().optional(),
        timezone: z.string().nullable().optional(),
        isArchived: z.boolean().nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    results: z.array(ProviderCandidateSchema),
    moreDataAvailable: z.boolean(),
    nextCursor: z.string().optional(),
    syncToken: z.string().optional()
});

const CandidateOutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    primaryEmailAddress: z.string().optional(),
    emailAddresses: z.array(z.string()).optional(),
    phoneNumbers: z.array(z.string()).optional(),
    socialLinks: z.array(z.unknown()).optional(),
    tags: z.array(z.unknown()).optional(),
    applicationIds: z.array(z.string()).optional(),
    profileUrl: z.string().optional(),
    source: z.unknown().optional(),
    creditedToUser: z.unknown().optional(),
    timezone: z.string().optional(),
    isArchived: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(CandidateOutputSchema),
    nextCursor: z.string().optional(),
    syncToken: z.string().optional()
});

function extractStringValue(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value === 'string') {
        return value;
    }
    const StringValueSchema = z.object({ value: z.string() }).passthrough();
    const parseResult = StringValueSchema.safeParse(value);
    if (parseResult.success) {
        return parseResult.data.value;
    }
    return undefined;
}

function extractEmailAddresses(candidate: z.infer<typeof ProviderCandidateSchema>): string[] | undefined {
    if (!candidate.emailAddresses || candidate.emailAddresses.length === 0) {
        return undefined;
    }
    const emails = candidate.emailAddresses.map((ea) => ea.value);
    return emails.length > 0 ? emails : undefined;
}

function extractPhoneNumbers(value: unknown): string[] | undefined {
    const PhoneItemSchema = z.string().or(z.object({ value: z.string() }).passthrough());
    const parseResult = z.array(PhoneItemSchema).safeParse(value);
    if (!parseResult.success) {
        return undefined;
    }
    const phones = parseResult.data.map((item) => (typeof item === 'string' ? item : item.value));
    return phones.length > 0 ? phones : undefined;
}

function mapCandidate(candidate: z.infer<typeof ProviderCandidateSchema>): z.infer<typeof CandidateOutputSchema> {
    const emailAddresses = extractEmailAddresses(candidate);
    const phoneNumbers = extractPhoneNumbers(candidate.phoneNumbers);
    const primaryEmailAddress = extractStringValue(candidate.primaryEmailAddress);
    return {
        id: candidate.id,
        ...(candidate.name != null && { name: candidate.name }),
        ...(candidate.createdAt != null && { createdAt: candidate.createdAt }),
        ...(candidate.updatedAt != null && { updatedAt: candidate.updatedAt }),
        ...(primaryEmailAddress !== undefined && { primaryEmailAddress }),
        ...(emailAddresses !== undefined && { emailAddresses }),
        ...(phoneNumbers !== undefined && { phoneNumbers }),
        ...(candidate.socialLinks != null && { socialLinks: candidate.socialLinks }),
        ...(candidate.tags != null && { tags: candidate.tags }),
        ...(candidate.applicationIds != null && { applicationIds: candidate.applicationIds }),
        ...(candidate.profileUrl != null && { profileUrl: candidate.profileUrl }),
        ...(candidate.source != null && { source: candidate.source }),
        ...(candidate.creditedToUser != null && { creditedToUser: candidate.creditedToUser }),
        ...(candidate.timezone != null && { timezone: candidate.timezone }),
        ...(candidate.isArchived != null && { isArchived: candidate.isArchived })
    };
}

const action = createAction({
    description: 'List candidates from Ashby.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-candidates',
        group: 'Candidates'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['candidatesRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.ashbyhq.com/reference/candidatelist
        const response = await nango.post({
            endpoint: '/candidate.list',
            data: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.createdAfter !== undefined && { createdAfter: input.createdAfter }),
                ...(input.syncToken !== undefined && { syncToken: input.syncToken })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Ashby API returned a non-success response.'
            });
        }

        return {
            items: providerResponse.results.map(mapCandidate),
            ...(providerResponse.nextCursor != null && { nextCursor: providerResponse.nextCursor }),
            ...(providerResponse.syncToken != null && { syncToken: providerResponse.syncToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
