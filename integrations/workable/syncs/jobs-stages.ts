import { createSync, type ProxyConfiguration } from 'nango';
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

const sync = createSync({
    description: 'Sync the pipeline stages configured for each job.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        JobStage: JobStageSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('JobStage');

        const jobsProxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/jobs
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

        for await (const jobsPage of nango.paginate(jobsProxyConfig)) {
            if (!Array.isArray(jobsPage)) {
                throw new Error('Invalid jobs page returned by provider');
            }

            for (const rawJob of jobsPage) {
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
        }

        await nango.trackDeletesEnd('JobStage');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
