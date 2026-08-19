import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const JobSchema = z.object({
    id: z.string(),
    shortcode: z.string(),
    title: z.string().optional(),
    state: z.string().optional()
});

const ProviderCandidateSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    firstname: z.string().nullish(),
    lastname: z.string().nullish(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    headline: z.string().nullish(),
    stage: z.string().nullish(),
    disqualified: z.boolean().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish()
});

const JobCandidateSchema = z.object({
    id: z.string(),
    candidate_id: z.string(),
    job_shortcode: z.string(),
    name: z.string().optional(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    headline: z.string().optional(),
    stage: z.string().optional(),
    disqualified: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    job_page_url: z.string(),
    job_shortcode: z.string(),
    candidate_page_url: z.string()
});

const sync = createSync({
    description: 'Sync candidates scoped to each job.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        JobCandidate: JobCandidateSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { job_page_url: '', job_shortcode: '', candidate_page_url: '' });

        let currentJobPageUrl: string = checkpoint.job_page_url || '/spi/v3/jobs';
        let resumeJobShortcode: string | undefined = checkpoint.job_shortcode || undefined;
        const candidatePageUrl: string | undefined = checkpoint.candidate_page_url || undefined;
        let nextJobPageUrl: string | undefined;

        await nango.trackDeletesStart('JobCandidate');

        const jobsProxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/list-jobs
            endpoint: '/spi/v3/jobs',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                response_path: 'jobs',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextJobPageUrl = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        if (currentJobPageUrl !== '/spi/v3/jobs') {
            const url = new URL(currentJobPageUrl);
            jobsProxyConfig.endpoint = url.pathname + url.search;
            jobsProxyConfig.baseUrlOverride = url.origin;
        }

        for await (const page of nango.paginate(jobsProxyConfig)) {
            const jobs: Array<z.infer<typeof JobSchema>> = [];
            for (const rawJob of page) {
                const parsed = JobSchema.safeParse(rawJob);
                if (!parsed.success) {
                    throw new Error(`Failed to parse job: ${parsed.error.message}`);
                }
                jobs.push(parsed.data);
            }

            if (jobs.length === 0) {
                if (nextJobPageUrl) {
                    await nango.saveCheckpoint({ job_page_url: nextJobPageUrl, job_shortcode: '', candidate_page_url: '' });
                    currentJobPageUrl = nextJobPageUrl;
                }
                continue;
            }

            for (const job of jobs) {
                if (resumeJobShortcode && job.shortcode !== resumeJobShortcode) {
                    continue;
                }

                if (resumeJobShortcode && job.shortcode === resumeJobShortcode) {
                    resumeJobShortcode = undefined;
                }

                let nextCandidatePageUrl: string | undefined;

                const candidatesProxyConfig: ProxyConfiguration = {
                    // https://workable.readme.io/reference/list-candidates
                    endpoint: '/spi/v3/candidates',
                    params: {
                        shortcode: job.shortcode
                    },
                    paginate: {
                        type: 'link',
                        link_path_in_response_body: 'paging.next',
                        response_path: 'candidates',
                        limit_name_in_request: 'limit',
                        limit: 100,
                        on_page: async ({ nextPageParam }) => {
                            nextCandidatePageUrl = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                        }
                    },
                    retries: 3
                };

                if (candidatePageUrl && job.shortcode === checkpoint.job_shortcode) {
                    const url = new URL(candidatePageUrl);
                    candidatesProxyConfig.endpoint = url.pathname + url.search;
                    candidatesProxyConfig.baseUrlOverride = url.origin;
                    delete candidatesProxyConfig.params;
                }

                for await (const candidatePage of nango.paginate(candidatesProxyConfig)) {
                    const candidates: Array<z.infer<typeof JobCandidateSchema>> = [];
                    for (const rawCandidate of candidatePage) {
                        const parsed = ProviderCandidateSchema.safeParse(rawCandidate);
                        if (!parsed.success) {
                            throw new Error(`Failed to parse candidate: ${parsed.error.message}`);
                        }
                        const candidate = parsed.data;
                        candidates.push({
                            id: `${job.shortcode}-${candidate.id}`,
                            candidate_id: candidate.id,
                            job_shortcode: job.shortcode,
                            ...(candidate.name != null && { name: candidate.name }),
                            ...(candidate.firstname != null && { firstname: candidate.firstname }),
                            ...(candidate.lastname != null && { lastname: candidate.lastname }),
                            ...(candidate.email != null && { email: candidate.email }),
                            ...(candidate.phone != null && { phone: candidate.phone }),
                            ...(candidate.headline != null && { headline: candidate.headline }),
                            ...(candidate.stage != null && { stage: candidate.stage }),
                            ...(candidate.disqualified != null && { disqualified: candidate.disqualified }),
                            ...(candidate.created_at != null && { created_at: candidate.created_at }),
                            ...(candidate.updated_at != null && { updated_at: candidate.updated_at })
                        });
                    }

                    if (candidates.length > 0) {
                        await nango.batchSave(candidates, 'JobCandidate');
                    }

                    await nango.saveCheckpoint({
                        job_page_url: currentJobPageUrl,
                        job_shortcode: job.shortcode,
                        candidate_page_url: nextCandidatePageUrl || ''
                    });
                }
            }

            if (nextJobPageUrl) {
                await nango.saveCheckpoint({ job_page_url: nextJobPageUrl, job_shortcode: '', candidate_page_url: '' });
                currentJobPageUrl = nextJobPageUrl;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('JobCandidate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
