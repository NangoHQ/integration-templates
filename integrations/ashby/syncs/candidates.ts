import { createSync } from 'nango';
import { z } from 'zod';

const AshbyEmailSchema = z
    .object({
        value: z.string()
    })
    .passthrough();

const AshbyPhoneSchema = z
    .object({
        value: z.string()
    })
    .passthrough();

const AshbyTagSchema = z
    .object({
        id: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const AshbyLocationSchema = z
    .object({
        id: z.string(),
        locationSummary: z.string().optional(),
        locationComponents: z
            .array(
                z.object({
                    type: z.string(),
                    name: z.string()
                })
            )
            .optional()
    })
    .passthrough();

const AshbySourceSchema = z
    .object({
        id: z.string(),
        title: z.string().optional()
    })
    .passthrough();

const AshbyUserSchema = z
    .object({
        id: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const AshbyCandidateSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    name: z.string(),
    primaryEmailAddress: AshbyEmailSchema.nullable().optional(),
    emailAddresses: z.array(AshbyEmailSchema).optional(),
    primaryPhoneNumber: AshbyPhoneSchema.nullable().optional(),
    phoneNumbers: z.array(AshbyPhoneSchema).optional(),
    position: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    school: z.string().nullable().optional(),
    applicationIds: z.array(z.string()).optional(),
    profileUrl: z.string().optional(),
    timezone: z.string().nullable().optional(),
    fraudStatus: z.string().nullable().optional(),
    tags: z.array(AshbyTagSchema).optional(),
    location: AshbyLocationSchema.nullable().optional(),
    source: AshbySourceSchema.nullable().optional(),
    creditedToUser: AshbyUserSchema.nullable().optional(),
    customFields: z.array(z.unknown()).optional(),
    fileHandles: z.array(z.unknown()).optional(),
    resumeFileHandle: z.object({}).passthrough().nullable().optional(),
    socialLinks: z.array(z.unknown()).optional()
});

const CandidateSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    name: z.string(),
    primaryEmailAddress: z.string().optional(),
    emailAddresses: z.array(AshbyEmailSchema).optional(),
    primaryPhoneNumber: z.string().optional(),
    phoneNumbers: z.array(AshbyPhoneSchema).optional(),
    position: z.string().optional(),
    company: z.string().optional(),
    school: z.string().optional(),
    applicationIds: z.array(z.string()).optional(),
    profileUrl: z.string().optional(),
    timezone: z.string().optional(),
    fraudStatus: z.string().optional(),
    tags: z.array(AshbyTagSchema).optional(),
    location: AshbyLocationSchema.optional(),
    source: AshbySourceSchema.optional(),
    creditedToUser: AshbyUserSchema.optional(),
    customFields: z.array(z.unknown()).optional()
});

const MetadataSchema = z.object({
    limit: z.number().optional(),
    max_pages: z.number().optional()
});

const CheckpointSchema = z.object({
    sync_token: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync candidates from Ashby',
    version: '1.3.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Candidate: CandidateSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/candidates' }],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const pageLimit = typeof metadata?.limit === 'number' && metadata.limit > 0 && metadata.limit < 100 ? metadata.limit : 100;
        const maxPages = typeof metadata?.max_pages === 'number' ? metadata.max_pages : undefined;
        let pageCount = 0;

        const checkpoint = await nango.getCheckpoint();
        let syncToken: string | undefined = checkpoint?.sync_token || undefined;
        let nextCursor: string | null = checkpoint?.cursor || null;

        while (true) {
            const response = await nango.post<{
                success: boolean;
                results: unknown[];
                moreDataAvailable: boolean;
                nextCursor?: string;
                syncToken?: string;
                errors?: string[];
            }>({
                // https://developers.ashbyhq.com/reference/candidatelist
                endpoint: '/candidate.list',
                data: {
                    limit: pageLimit,
                    ...(syncToken && { syncToken }),
                    ...(nextCursor && { cursor: nextCursor })
                },
                retries: 3
            });

            const responseData = response.data;

            if (!responseData.success) {
                let errorMessage = 'There was an error when running the script';
                if (responseData.errors && responseData.errors.length > 0) {
                    errorMessage += `: ${responseData.errors.join(', ')}`;
                }
                throw new Error(errorMessage);
            }

            if (responseData.syncToken) {
                syncToken = responseData.syncToken;
            }
            nextCursor = responseData.nextCursor ?? null;

            const candidates = [];
            for (const item of responseData.results) {
                const parsed = AshbyCandidateSchema.parse(item);
                candidates.push({
                    id: parsed.id,
                    createdAt: parsed.createdAt,
                    updatedAt: parsed.updatedAt,
                    name: parsed.name,
                    primaryEmailAddress: parsed.primaryEmailAddress?.value ?? undefined,
                    emailAddresses: parsed.emailAddresses,
                    primaryPhoneNumber: parsed.primaryPhoneNumber?.value ?? undefined,
                    phoneNumbers: parsed.phoneNumbers,
                    position: parsed.position ?? undefined,
                    company: parsed.company ?? undefined,
                    school: parsed.school ?? undefined,
                    applicationIds: parsed.applicationIds,
                    profileUrl: parsed.profileUrl,
                    timezone: parsed.timezone ?? undefined,
                    fraudStatus: parsed.fraudStatus ?? undefined,
                    tags: parsed.tags,
                    location: parsed.location ?? undefined,
                    source: parsed.source ?? undefined,
                    creditedToUser: parsed.creditedToUser ?? undefined,
                    customFields: parsed.customFields
                });
            }

            if (candidates.length > 0) {
                await nango.batchSave(candidates, 'Candidate');
            }

            await nango.saveCheckpoint({
                sync_token: syncToken ?? '',
                cursor: nextCursor ?? ''
            });

            pageCount += 1;
            if (!responseData.moreDataAvailable) break;
            if (maxPages && pageCount >= maxPages) break;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
