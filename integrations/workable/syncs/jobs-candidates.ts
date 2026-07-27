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

const sync = createSync({
    description: 'Sync candidates scoped to each job.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        JobCandidate: JobCandidateSchema
    },

    exec: async (nango) => {
        const jobsProxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/list-jobs
            endpoint: '/spi/v3/jobs',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                response_path: 'jobs',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        const jobs: Array<z.infer<typeof JobSchema>> = [];
        for await (const page of nango.paginate(jobsProxyConfig)) {
            for (const rawJob of page) {
                const parsed = JobSchema.safeParse(rawJob);
                if (!parsed.success) {
                    throw new Error(`Failed to parse job: ${parsed.error.message}`);
                }
                jobs.push(parsed.data);
            }
        }

        if (jobs.length === 0) {
            return;
        }

        await nango.trackDeletesStart('JobCandidate');

        for (const job of jobs) {
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
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate(candidatesProxyConfig)) {
                const candidates: Array<z.infer<typeof JobCandidateSchema>> = [];
                for (const rawCandidate of page) {
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
            }
        }

        await nango.trackDeletesEnd('JobCandidate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
