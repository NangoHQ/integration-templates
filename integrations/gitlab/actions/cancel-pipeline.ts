import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.union([z.number(), z.string()]).describe('Project ID or URL-encoded path. Example: 82599306'),
    pipeline_id: z.number().describe('Pipeline ID. Example: 46')
});

const ProviderUserSchema = z.object({
    id: z.number(),
    name: z.string(),
    username: z.string(),
    state: z.string(),
    avatar_url: z.string().optional(),
    web_url: z.string().optional()
});

const ProviderPipelineSchema = z
    .object({
        id: z.number(),
        iid: z.number(),
        project_id: z.number(),
        status: z.string(),
        ref: z.string().optional(),
        sha: z.string().optional(),
        before_sha: z.string().optional(),
        tag: z.boolean().optional(),
        yaml_errors: z.string().nullable().optional(),
        user: ProviderUserSchema.optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        started_at: z.string().nullable().optional(),
        finished_at: z.string().nullable().optional(),
        committed_at: z.string().nullable().optional(),
        duration: z.number().nullable().optional(),
        queued_duration: z.number().nullable().optional(),
        coverage: z.number().nullable().optional(),
        web_url: z.string().optional(),
        archived: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = ProviderPipelineSchema;

const action = createAction({
    description: 'Cancel a GitLab pipeline.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/cancel-pipeline',
        group: 'Pipelines'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.gitlab.com/api/pipelines/#cancel-all-jobs-for-a-pipeline
            endpoint: `/api/v4/projects/${String(input.project_id)}/pipelines/${input.pipeline_id}/cancel`,
            retries: 1
        });

        const pipeline = ProviderPipelineSchema.parse(response.data);

        return pipeline;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
