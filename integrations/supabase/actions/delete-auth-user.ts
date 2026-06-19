import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    user_id: z.string().uuid().describe('The UUID of the auth user to delete. Example: "afece930-4935-43c3-9484-46bc38da98f7"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    user_id: z.string()
});

const action = createAction({
    description: 'Delete or archive a auth user in Supabase.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const projectUrl = connection.connection_config?.['projectUrl'];
        const baseUrlOverride = typeof projectUrl === 'string' ? (projectUrl.startsWith('http') ? projectUrl : `https://${projectUrl}`) : undefined;

        const encodedUserId = encodeURIComponent(input.user_id);

        const config: ProxyConfiguration = {
            // https://supabase.com/docs/reference/api/delete-a-user
            endpoint: `/auth/v1/admin/users/${encodedUserId}`,
            baseUrlOverride,
            retries: 3
        };

        const response = await nango.delete(config);

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete user. Status: ${response.status}`,
                user_id: input.user_id
            });
        }

        return {
            success: true,
            user_id: input.user_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
