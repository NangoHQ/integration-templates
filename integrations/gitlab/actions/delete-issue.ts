import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.union([z.number(), z.string()]).describe('The global ID or URL-encoded path of the project. Example: 82599306'),
    issue_iid: z.number().describe('The internal ID of a project issue. Example: 1')
});

const OutputSchema = z.object({
    success: z.boolean(),
    project_id: z.union([z.number(), z.string()]),
    issue_iid: z.number()
});

const action = createAction({
    description: 'Delete or archive a issue in GitLab.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.gitlab.com/api/issues/#delete-an-issue
        await nango.delete({
            endpoint: `/api/v4/projects/${String(input.project_id)}/issues/${input.issue_iid}`,
            retries: 1
        });

        return {
            success: true,
            project_id: input.project_id,
            issue_iid: input.issue_iid
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
