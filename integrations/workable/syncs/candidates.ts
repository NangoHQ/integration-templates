import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CandidateSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    headline: z.string().optional(),
    account: z
        .object({
            subdomain: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    job: z
        .object({
            shortcode: z.string().optional(),
            title: z.string().optional()
        })
        .optional(),
    stage: z.string().optional(),
    stage_kind: z.string().optional(),
    disqualified: z.boolean().optional(),
    withdrew: z.boolean().optional(),
    disqualification_reason: z.string().optional(),
    sourced: z.boolean().optional(),
    profile_url: z.string().optional(),
    email: z.string().optional(),
    domain: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    hired_at: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    resume_metadata: z
        .object({
            filename: z.string().optional(),
            filetype: z.string().optional(),
            created_at: z.string().optional(),
            updated_at: z.string().optional()
        })
        .optional()
});

const CandidateListSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    firstname: z.string().nullish(),
    lastname: z.string().nullish(),
    headline: z.string().nullish(),
    account: z
        .object({
            subdomain: z.string().nullish(),
            name: z.string().nullish()
        })
        .nullish(),
    job: z
        .object({
            shortcode: z.string().nullish(),
            title: z.string().nullish()
        })
        .nullish(),
    stage: z.string().nullish(),
    stage_kind: z.string().nullish(),
    disqualified: z.boolean().nullish(),
    withdrew: z.boolean().nullish(),
    disqualification_reason: z.string().nullish(),
    sourced: z.boolean().nullish(),
    profile_url: z.string().nullish(),
    email: z.string().nullish(),
    domain: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    hired_at: z.string().nullish(),
    address: z.string().nullish(),
    phone: z.string().nullish(),
    resume_metadata: z
        .object({
            filename: z.string().nullish(),
            filetype: z.string().nullish(),
            created_at: z.string().nullish(),
            updated_at: z.string().nullish()
        })
        .nullish()
});

const CandidatesPageSchema = z.object({
    candidates: z.array(CandidateListSchema),
    paging: z
        .object({
            next: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    since_id: z.string()
});

const WebhookPayloadSchema = z.object({
    event: z.string().optional(),
    candidate: z
        .object({
            id: z.string().optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync candidates across all jobs and the talent pool',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Candidate: CandidateSchema
    },
    webhookSubscriptions: ['candidate_deleted'],
    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter: string | undefined = checkpoint && checkpoint['updated_after'] !== '' ? checkpoint['updated_after'] : undefined;
        let sinceId: string | undefined = checkpoint && checkpoint['since_id'] !== '' ? checkpoint['since_id'] : undefined;

        let maxUpdatedAt: string | undefined;
        let hasMore = true;

        while (hasMore) {
            const proxyConfig: ProxyConfiguration = {
                // https://workable.readme.io/reference/job-candidates-index.md
                endpoint: '/spi/v3/candidates',
                params: {
                    limit: 100,
                    ...(updatedAfter ? { updated_after: updatedAfter } : {}),
                    ...(sinceId ? { since_id: sinceId } : {})
                },
                retryOn: [404, 429],
                retries: 3
            };

            const response = await nango.get(proxyConfig);

            const parsedPage = CandidatesPageSchema.safeParse(response.data);
            if (!parsedPage.success) {
                throw new Error(`Invalid candidates page: ${parsedPage.error.message}`);
            }

            const page = parsedPage.data.candidates;

            const candidates = page.map((record) => {
                const candidate = {
                    id: record.id,
                    ...(record.name != null && { name: record.name }),
                    ...(record.firstname != null && { firstname: record.firstname }),
                    ...(record.lastname != null && { lastname: record.lastname }),
                    ...(record.headline != null && { headline: record.headline }),
                    ...(record.account != null && {
                        account: {
                            ...(record.account.subdomain != null && { subdomain: record.account.subdomain }),
                            ...(record.account.name != null && { name: record.account.name })
                        }
                    }),
                    ...(record.job != null && {
                        job: {
                            ...(record.job.shortcode != null && { shortcode: record.job.shortcode }),
                            ...(record.job.title != null && { title: record.job.title })
                        }
                    }),
                    ...(record.stage != null && { stage: record.stage }),
                    ...(record.stage_kind != null && { stage_kind: record.stage_kind }),
                    ...(record.disqualified != null && { disqualified: record.disqualified }),
                    ...(record.withdrew != null && { withdrew: record.withdrew }),
                    ...(record.disqualification_reason != null && { disqualification_reason: record.disqualification_reason }),
                    ...(record.sourced != null && { sourced: record.sourced }),
                    ...(record.profile_url != null && { profile_url: record.profile_url }),
                    ...(record.email != null && { email: record.email }),
                    ...(record.domain != null && { domain: record.domain }),
                    ...(record.created_at != null && { created_at: record.created_at }),
                    ...(record.updated_at != null && { updated_at: record.updated_at }),
                    ...(record.hired_at != null && { hired_at: record.hired_at }),
                    ...(record.address != null && { address: record.address }),
                    ...(record.phone != null && { phone: record.phone }),
                    ...(record.resume_metadata != null && {
                        resume_metadata: {
                            ...(record.resume_metadata.filename != null && { filename: record.resume_metadata.filename }),
                            ...(record.resume_metadata.filetype != null && { filetype: record.resume_metadata.filetype }),
                            ...(record.resume_metadata.created_at != null && { created_at: record.resume_metadata.created_at }),
                            ...(record.resume_metadata.updated_at != null && { updated_at: record.resume_metadata.updated_at })
                        }
                    })
                };

                if (record.updated_at != null && (maxUpdatedAt === undefined || record.updated_at > maxUpdatedAt)) {
                    maxUpdatedAt = record.updated_at;
                }

                return candidate;
            });

            if (candidates.length > 0) {
                await nango.batchSave(candidates, 'Candidate');
            }

            const nextUrl = parsedPage.data.paging?.next;
            if (nextUrl) {
                const nextUrlObj = new URL(nextUrl);
                const nextSinceId = nextUrlObj.searchParams.get('since_id');
                if (nextSinceId) {
                    sinceId = nextSinceId;
                    await nango.saveCheckpoint({
                        updated_after: updatedAfter || '',
                        since_id: sinceId
                    });
                } else {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }

        if (maxUpdatedAt !== undefined) {
            await nango.saveCheckpoint({
                updated_after: maxUpdatedAt,
                since_id: ''
            });
        }
    },
    onWebhook: async (nango, payload: unknown) => {
        const parsed = WebhookPayloadSchema.safeParse(payload);
        if (!parsed.success) {
            return;
        }

        if (parsed.data.event === 'candidate_deleted' && parsed.data.candidate?.id) {
            await nango.batchDelete([{ id: parsed.data.candidate.id }], 'Candidate');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
