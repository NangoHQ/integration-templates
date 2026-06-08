import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().uuid().describe('The UUID of the Supabase Auth user whose MFA factors to list. Example: "a02e344e-4eba-473d-b299-b751cbd1fa2c"')
});

const ProviderFactorSchema = z.object({
    id: z.string(),
    user_id: z.string(),
    friendly_name: z.string().nullable().optional(),
    factor_type: z.enum(['totp', 'phone']).optional(),
    status: z.enum(['verified', 'unverified']).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const FactorSchema = z.object({
    id: z.string(),
    user_id: z.string(),
    friendly_name: z.string().optional(),
    factor_type: z.enum(['totp', 'phone']).optional(),
    status: z.enum(['verified', 'unverified']).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    factors: z.array(FactorSchema)
});

const action = createAction({
    description: 'List MFA factors enrolled for a specific user in Supabase.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-auth-factors',
        group: 'Auth'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['service_role'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config;
        let projectUrl: string | undefined;
        if (typeof connectionConfig === 'object' && connectionConfig !== null && 'projectUrl' in connectionConfig) {
            const maybeUrl = connectionConfig['projectUrl'];
            if (typeof maybeUrl === 'string') {
                projectUrl = maybeUrl;
            }
        }
        const baseUrlOverride = projectUrl ? (projectUrl.startsWith('http') ? projectUrl : `https://${projectUrl}`) : undefined;

        // https://supabase.com/docs/reference/api/admin-list-user-factors
        const response = await nango.get({
            endpoint: `/auth/v1/admin/users/${encodeURIComponent(input.user_id)}/factors`,
            baseUrlOverride,
            retries: 3
        });

        const rawFactors = Array.isArray(response.data) ? response.data : [];
        const factors = rawFactors.map((item) => {
            const parsed = ProviderFactorSchema.safeParse(item);
            if (!parsed.success) {
                return null;
            }
            const factor = parsed.data;
            return {
                id: factor.id,
                user_id: factor.user_id,
                ...(factor.friendly_name != null && { friendly_name: factor.friendly_name }),
                ...(factor.factor_type !== undefined && { factor_type: factor.factor_type }),
                ...(factor.status !== undefined && { status: factor.status }),
                ...(factor.created_at !== undefined && { created_at: factor.created_at }),
                ...(factor.updated_at !== undefined && { updated_at: factor.updated_at })
            };
        });

        const validFactors = factors.filter((f) => f !== null);

        return { factors: validFactors };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
