import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.union([z.number(), z.string()]).describe('Project ID or URL-encoded path. Example: "82599306"'),
    branch: z.string().describe('Name of the branch to delete. Example: "feature/test"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    project_id: z.union([z.number(), z.string()]).optional(),
    branch: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a branch in GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-branch',
        group: 'Branches'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input) => {
        // https://docs.gitlab.com/api/branches/#delete-repository-branch
        await nango.delete({
            endpoint: `/api/v4/projects/${encodeURIComponent(String(input.project_id))}/repository/branches/${encodeURIComponent(input.branch)}`,
            retries: 3
        });

        return {
            success: true,
            project_id: input.project_id,
            branch: input.branch
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
