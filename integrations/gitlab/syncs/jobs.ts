import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const JobSchema = z.object({
    id: z.string(),
    name: z.string(),
    project_id: z.number(),
    pipeline_id: z.number(),
    ref: z.string().optional(),
    stage: z.string().optional(),
    status: z.string(),
    failure_reason: z.string().optional(),
    tag: z.boolean().optional(),
    web_url: z.string().optional(),
    created_at: z.string(),
    started_at: z.string().optional(),
    finished_at: z.string().optional(),
    duration: z.number().optional(),
    queued_duration: z.number().optional(),
    coverage: z.number().optional(),
    allow_failure: z.boolean().optional(),
    user_id: z.number().optional(),
    runner_id: z.number().optional()
});

const CheckpointSchema = z.object({
    last_id: z.number()
});

const ProviderProjectSchema = z.object({
    id: z.number()
});

const ProviderJobSchema = z.object({
    id: z.number(),
    name: z.string(),
    pipeline: z.object({
        id: z.number(),
        project_id: z.number()
    }),
    ref: z.string().optional(),
    stage: z.string().optional(),
    status: z.string(),
    failure_reason: z.string().nullable().optional(),
    tag: z.boolean().optional(),
    web_url: z.string().optional(),
    created_at: z.string(),
    started_at: z.string().nullable().optional(),
    finished_at: z.string().nullable().optional(),
    duration: z.number().nullable().optional(),
    queued_duration: z.number().nullable().optional(),
    coverage: z.number().nullable().optional(),
    allow_failure: z.boolean().optional(),
    user: z
        .object({
            id: z.number()
        })
        .optional(),
    runner: z
        .object({
            id: z.number()
        })
        .nullable()
        .optional()
});

const sync = createSync({
    description: 'Sync jobs from GitLab.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Job: JobSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/jobs'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const initialLastId = checkpoint?.last_id;
        let maxLastId = initialLastId;

        const projectsConfig: ProxyConfiguration = {
            // https://docs.gitlab.com/api/projects/#list-all-projects
            endpoint: '/api/v4/projects',
            params: {
                membership: 'true',
                per_page: 100
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        for await (const projectBatch of nango.paginate(projectsConfig)) {
            const projects = z.array(ProviderProjectSchema).safeParse(projectBatch);
            if (!projects.success) {
                throw new Error('Failed to parse projects response');
            }

            for (const project of projects.data) {
                const jobsConfig: ProxyConfiguration = {
                    // https://docs.gitlab.com/api/jobs/#list-all-jobs-for-a-project
                    endpoint: `/api/v4/projects/${encodeURIComponent(String(project.id))}/jobs`,
                    params: {
                        order_by: 'id',
                        sort: 'asc',
                        per_page: 100,
                        ...(initialLastId !== undefined && { id_after: initialLastId })
                    },
                    paginate: {
                        type: 'offset',
                        offset_name_in_request: 'page',
                        offset_start_value: 1,
                        offset_calculation_method: 'per-page',
                        limit_name_in_request: 'per_page',
                        limit: 100
                    },
                    retries: 3
                };

                for await (const jobBatch of nango.paginate(jobsConfig)) {
                    const jobs = z.array(ProviderJobSchema).safeParse(jobBatch);
                    if (!jobs.success) {
                        throw new Error('Failed to parse jobs response');
                    }

                    const mappedJobs = jobs.data.map((job) => ({
                        id: String(job.id),
                        name: job.name,
                        project_id: job.pipeline.project_id,
                        pipeline_id: job.pipeline.id,
                        ...(job.ref !== undefined && { ref: job.ref }),
                        ...(job.stage !== undefined && { stage: job.stage }),
                        status: job.status,
                        ...(job.failure_reason !== null && job.failure_reason !== undefined && { failure_reason: job.failure_reason }),
                        ...(job.tag !== undefined && { tag: job.tag }),
                        ...(job.web_url !== undefined && { web_url: job.web_url }),
                        created_at: job.created_at,
                        ...(job.started_at !== null && job.started_at !== undefined && { started_at: job.started_at }),
                        ...(job.finished_at !== null && job.finished_at !== undefined && { finished_at: job.finished_at }),
                        ...(job.duration !== null && job.duration !== undefined && { duration: job.duration }),
                        ...(job.queued_duration !== null && job.queued_duration !== undefined && { queued_duration: job.queued_duration }),
                        ...(job.coverage !== null && job.coverage !== undefined && { coverage: job.coverage }),
                        ...(job.allow_failure !== undefined && { allow_failure: job.allow_failure }),
                        ...(job.user !== undefined && { user_id: job.user.id }),
                        ...(job.runner !== null && job.runner !== undefined && { runner_id: job.runner.id })
                    }));

                    if (mappedJobs.length > 0) {
                        await nango.batchSave(mappedJobs, 'Job');

                        const batchMaxId = Math.max(...jobs.data.map((job) => job.id));
                        if (maxLastId === undefined || batchMaxId > maxLastId) {
                            maxLastId = batchMaxId;
                        }
                    }
                }
            }
        }

        if (maxLastId !== undefined) {
            await nango.saveCheckpoint({ last_id: maxLastId });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
