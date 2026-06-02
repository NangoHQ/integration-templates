import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('The ID of the project containing the merge request. Example: 82599306'),
    merge_request_iid: z.number().describe('The internal ID of the merge request. Example: 1')
});

const ProviderMergeRequestSchema = z.object({
    id: z.number(),
    iid: z.number(),
    project_id: z.number(),
    title: z.string(),
    state: z.string(),
    source_branch: z.string().optional(),
    target_branch: z.string().optional(),
    web_url: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.number().optional(),
    iid: z.number().optional(),
    project_id: z.number().optional(),
    title: z.string().optional(),
    state: z.string().optional()
});

const action = createAction({
    description: 'Delete a merge request in GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-merge-request',
        group: 'Merge Requests'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.gitlab.com/api/merge_requests/#delete-a-merge-request
            endpoint: `/api/v4/projects/${encodeURIComponent(String(input.project_id))}/merge_requests/${encodeURIComponent(String(input.merge_request_iid))}`,
            retries: 10
        });

        if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
            const mr = ProviderMergeRequestSchema.parse(response.data);
            return {
                success: true,
                id: mr.id,
                iid: mr.iid,
                project_id: mr.project_id,
                title: mr.title,
                state: mr.state
            };
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
