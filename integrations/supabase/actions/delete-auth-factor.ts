import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('User ID. Example: "a02e344e-4eba-473d-b299-b751cbd1fa2c"'),
    factor_id: z.string().describe('MFA factor ID to delete. Example: "factor-uuid"')
});

const ProviderFactorSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    status: z.string(),
    factor_type: z.string(),
    friendly_name: z.string().nullable().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    user_id: z.string(),
    factor_id: z.string(),
    factor_type: z.string().optional(),
    status: z.string().optional(),
    friendly_name: z.string().optional()
});

const action = createAction({
    description: 'Delete an MFA factor for a user in Supabase.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-auth-factor',
        group: 'Auth'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        const projectUrl =
            connectionConfig && typeof connectionConfig === 'object' && 'projectUrl' in connectionConfig ? connectionConfig['projectUrl'] : undefined;
        const baseUrlOverride = typeof projectUrl === 'string' && projectUrl.startsWith('http') ? projectUrl : undefined;

        // https://supabase.com/docs/reference/api
        const listResponse = await nango.get({
            endpoint: '/auth/v1/admin/users/' + encodeURIComponent(input.user_id) + '/factors',
            retries: 3,
            baseUrlOverride
        });

        const factors = z.array(ProviderFactorSchema).parse(listResponse.data);
        const factor = factors.find((f) => f.id === input.factor_id);

        if (!factor) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'MFA factor not found for user',
                user_id: input.user_id,
                factor_id: input.factor_id
            });
        }

        // https://supabase.com/docs/reference/api
        await nango.delete({
            endpoint: '/auth/v1/admin/users/' + encodeURIComponent(input.user_id) + '/factors/' + encodeURIComponent(input.factor_id),
            retries: 3,
            baseUrlOverride
        });

        return {
            success: true,
            user_id: input.user_id,
            factor_id: input.factor_id,
            ...(factor.factor_type !== undefined && { factor_type: factor.factor_type }),
            ...(factor.status !== undefined && { status: factor.status }),
            ...(factor.friendly_name != null && { friendly_name: factor.friendly_name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
