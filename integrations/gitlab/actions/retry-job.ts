import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('Project ID. Example: 82599306'),
    job_id: z.number().describe('Job ID. Example: 12345')
});

const ProviderUserSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        username: z.string(),
        state: z.string(),
        avatar_url: z.string().nullable().optional()
    })
    .passthrough();

const ProviderCommitSchema = z
    .object({
        id: z.string(),
        short_id: z.string(),
        title: z.string(),
        message: z.string(),
        author_name: z.string(),
        authored_date: z.string()
    })
    .passthrough();

const ProviderPipelineSchema = z
    .object({
        id: z.number(),
        sha: z.string(),
        ref: z.string(),
        status: z.string()
    })
    .passthrough();

const ProviderJobSchema = z
    .object({
        id: z.number(),
        status: z.string(),
        stage: z.string(),
        name: z.string(),
        ref: z.string(),
        tag: z.boolean(),
        coverage: z.string().nullable().optional(),
        created_at: z.string(),
        started_at: z.string().nullable().optional(),
        finished_at: z.string().nullable().optional(),
        duration: z.number().nullable().optional(),
        queued_duration: z.number().nullable().optional(),
        user: ProviderUserSchema.optional(),
        commit: ProviderCommitSchema.optional(),
        pipeline: ProviderPipelineSchema.optional(),
        web_url: z.string()
    })
    .passthrough();

const OutputSchema = ProviderJobSchema;

const action = createAction({
    description: 'Retry a GitLab CI job.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/retry-job',
        group: 'Jobs'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.gitlab.com/api/jobs/#retry-a-job
            endpoint: `/api/v4/projects/${encodeURIComponent(String(input.project_id))}/jobs/${encodeURIComponent(String(input.job_id))}/retry`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Job not found or could not be retried',
                project_id: input.project_id,
                job_id: input.job_id
            });
        }

        const providerJob = ProviderJobSchema.parse(response.data);

        return providerJob;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
