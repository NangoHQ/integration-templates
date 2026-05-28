import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('The ID or URL-encoded path of the project. Example: "82599306" or "group/project".'),
    pipeline_id: z.number().describe('The ID of the pipeline to delete. Example: 123')
});

const OutputSchema = z.object({
    success: z.boolean(),
    project_id: z.string(),
    pipeline_id: z.number()
});

const action = createAction({
    description:
        'Delete a pipeline in GitLab. This permanently deletes the pipeline and all immediately related objects, such as builds, logs, artifacts, and triggers. This action cannot be undone.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-pipeline',
        group: 'Pipelines'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedProjectId = encodeURIComponent(String(input.project_id));

        // https://docs.gitlab.com/api/pipelines/#delete-a-pipeline
        await nango.delete({
            endpoint: `/api/v4/projects/${encodedProjectId}/pipelines/${input.pipeline_id}`,
            retries: 3
        });

        return {
            success: true,
            project_id: String(input.project_id),
            pipeline_id: input.pipeline_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
