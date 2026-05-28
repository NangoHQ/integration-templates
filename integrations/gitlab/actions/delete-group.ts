import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_id: z.union([z.number(), z.string()]).describe('The ID or URL-encoded path of the group. Example: 123'),
    permanently_remove: z.boolean().optional().describe('If true, immediately deletes a subgroup already marked for deletion.'),
    full_path: z.string().optional().describe('The full path to the subgroup. Required when permanently_remove is true.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    group_id: z.union([z.number(), z.string()]).optional()
});

const action = createAction({
    description: 'Delete or archive a group in GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.permanently_remove !== undefined) {
            params['permanently_remove'] = String(input.permanently_remove);
        }

        if (input.full_path !== undefined) {
            params['full_path'] = input.full_path;
        }

        // https://docs.gitlab.com/api/groups/#delete-a-group
        await nango.delete({
            endpoint: `/api/v4/groups/${String(input.group_id)}`,
            params,
            retries: 3
        });

        return {
            success: true,
            group_id: input.group_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
