import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('The ID or URL-encoded path of the project. Example: 82599306'),
    pipeline_id: z.number().describe('The ID of the pipeline. Example: 287')
});

const PipelineUserSchema = z.object({
    id: z.number(),
    username: z.string(),
    name: z.string(),
    state: z.string(),
    avatar_url: z.string(),
    web_url: z.string()
});

const PipelineDetailedStatusSchema = z.object({
    icon: z.string(),
    text: z.string(),
    label: z.string(),
    group: z.string(),
    tooltip: z.string(),
    has_details: z.boolean(),
    details_path: z.string(),
    illustration: z.string().nullable().optional(),
    favicon: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    iid: z.number(),
    project_id: z.number(),
    name: z.string().nullable().optional(),
    sha: z.string(),
    ref: z.string(),
    status: z.string(),
    source: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    web_url: z.string(),
    before_sha: z.string(),
    tag: z.boolean(),
    yaml_errors: z.string().nullable().optional(),
    user: PipelineUserSchema.nullable().optional(),
    started_at: z.string().nullable().optional(),
    finished_at: z.string().nullable().optional(),
    committed_at: z.string().nullable().optional(),
    duration: z.number().nullable().optional(),
    queued_duration: z.number().nullable().optional(),
    coverage: z.string().nullable().optional(),
    detailed_status: PipelineDetailedStatusSchema.nullable().optional(),
    archived: z.boolean()
});

const action = createAction({
    description: 'Retrieve a single pipeline from GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-pipeline',
        group: 'Pipelines'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.gitlab.com/api/pipelines/#retrieve-a-single-pipeline
            endpoint: `/api/v4/projects/${encodeURIComponent(String(input.project_id))}/pipelines/${encodeURIComponent(String(input.pipeline_id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Pipeline not found',
                project_id: input.project_id,
                pipeline_id: input.pipeline_id
            });
        }

        const pipeline = OutputSchema.parse(response.data);
        return pipeline;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
