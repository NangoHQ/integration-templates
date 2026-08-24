import { createSync } from 'nango';
import { z } from 'zod';

const JobStageSchema = z.object({
    id: z.string(),
    job_shortcode: z.string(),
    slug: z.string(),
    name: z.string(),
    kind: z.string(),
    position: z.number()
});

const JobSchema = z.object({
    shortcode: z.string()
});

const ProviderStageSchema = z.object({
    slug: z.string(),
    name: z.string(),
    kind: z.string(),
    position: z.number()
});

const StagesResponseSchema = z.object({
    stages: z.array(ProviderStageSchema)
});

const JobsResponseSchema = z.object({
    jobs: z.array(JobSchema),
    paging: z
        .object({
            next: z.string().optional().nullable()
        })
        .optional()
});

const CheckpointSchema = z.object({
    jobs_next_url: z.string()
});

const sync = createSync({
    description: 'Sync the pipeline stages configured for each job.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        JobStage: JobStageSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { jobs_next_url: '' });
        if (!checkpointResult.success) {
            throw new Error('Invalid checkpoint');
        }
        const checkpoint = checkpointResult.data;

        await nango.trackDeletesStart('JobStage');

        let jobsNextUrl: string | undefined = checkpoint.jobs_next_url || undefined;

        while (true) {
            let jobsResponse;
            if (jobsNextUrl) {
                const parsed = new URL(jobsNextUrl);
                const params: Record<string, string> = {};
                parsed.searchParams.forEach((value, key) => {
                    params[key] = value;
                });
                jobsResponse = await nango.get({
                    // https://workable.readme.io/reference/jobs
                    endpoint: parsed.pathname,
                    params,
                    retries: 3
                });
            } else {
                jobsResponse = await nango.get({
                    // https://workable.readme.io/reference/jobs
                    endpoint: '/spi/v3/jobs',
                    params: {
                        limit: 100
                    },
                    retries: 3
                });
            }

            const jobsResult = JobsResponseSchema.safeParse(jobsResponse.data);
            if (!jobsResult.success) {
                throw new Error('Invalid jobs response from provider');
            }

            const jobsData = jobsResult.data;

            for (const rawJob of jobsData.jobs) {
                const jobResult = JobSchema.safeParse(rawJob);
                if (!jobResult.success) {
                    throw new Error('Invalid job object returned by provider');
                }

                const job = jobResult.data;

                // https://workable.readme.io/reference/job-stages
                const stagesResponse = await nango.get({
                    endpoint: `/spi/v3/jobs/${encodeURIComponent(job.shortcode)}/stages`,
                    retries: 3
                });

                const stagesResult = StagesResponseSchema.safeParse(stagesResponse.data);
                if (!stagesResult.success) {
                    throw new Error('Invalid stages response from provider');
                }

                const rawStages = stagesResult.data.stages;

                const stages = rawStages.map((rawStage) => {
                    const stageResult = ProviderStageSchema.safeParse(rawStage);
                    if (!stageResult.success) {
                        throw new Error('Invalid stage object returned by provider');
                    }

                    const stage = stageResult.data;

                    return {
                        id: `${job.shortcode}_${stage.slug}`,
                        job_shortcode: job.shortcode,
                        slug: stage.slug,
                        name: stage.name,
                        kind: stage.kind,
                        position: stage.position
                    };
                });

                if (stages.length > 0) {
                    await nango.batchSave(stages, 'JobStage');
                }
            }

            if (jobsData.paging?.next) {
                await nango.saveCheckpoint({ jobs_next_url: jobsData.paging.next });
                jobsNextUrl = jobsData.paging.next;
            } else {
                break;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('JobStage');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
