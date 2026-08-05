import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    company_id: z.string().describe('Company ID to filter approver users. Example: "16637"')
});

const ConnectionConfigSchema = z.object({
    tenant: z.string()
});

const AuthorizeResponseSchema = z
    .object({
        access_token: z.string().optional(),
        user_id: z.union([z.string(), z.number()]).optional(),
        data: z
            .object({
                access_token: z.string().optional(),
                user_id: z.union([z.string(), z.number()]).optional()
            })
            .optional()
    })
    .transform((val) => ({
        access_token: val.access_token ?? val.data?.access_token,
        user_id: val.user_id !== undefined ? String(val.user_id) : val.data?.user_id !== undefined ? String(val.data.user_id) : undefined
    }))
    .refine((val): val is { access_token: string; user_id: string } => typeof val.access_token === 'string' && typeof val.user_id === 'string', {
        message: 'Authorize response missing access_token or user_id'
    });

const ProviderApproverUserSchema = z.object({
    id: z.string(),
    user_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().nullable().optional(),
    roles: z.array(z.string()).optional(),
    state: z.string().optional(),
    last_login: z.string().optional(),
    created_date: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderApproverUserSchema).optional(),
    status: z.boolean().optional(),
    total: z.number().optional()
});

const OutputUserSchema = z.object({
    id: z.string(),
    user_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    roles: z.array(z.string()).optional(),
    state: z.string().optional(),
    last_login: z.string().optional(),
    created_date: z.string().optional()
});

const OutputSchema = z.object({
    users: z.array(OutputUserSchema),
    total: z.number().optional()
});

const action = createAction({
    description: 'List users who can act as approvers for a given company.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
        if (!connectionConfig.success) {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'Connection config must include tenant.'
            });
        }
        const tenant = connectionConfig.data.tenant;

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authorizeResponse = await nango.post({
            endpoint: '/w/authorize',
            retries: 3
        });

        const authorizeParsed = AuthorizeResponseSchema.safeParse(authorizeResponse.data);
        if (!authorizeParsed.success) {
            throw new nango.ActionError({
                type: 'auth_failed',
                message: 'Failed to obtain access_token or user_id from /w/authorize'
            });
        }
        const authorizeData = authorizeParsed.data;

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const response = await nango.get({
            endpoint: '/r/user/get_approver_users',
            params: {
                company_id: input.company_id
            },
            headers: {
                Authorization: `Bearer ${authorizeData.access_token}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': authorizeData.user_id
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const rawUsers = providerResponse.data ?? [];

        const users = rawUsers.map((user) => ({
            id: user.id,
            ...(user.user_name !== undefined && { user_name: user.user_name }),
            ...(user.first_name !== undefined && { first_name: user.first_name }),
            ...(user.last_name !== undefined && { last_name: user.last_name }),
            ...(user.email !== undefined && { email: user.email }),
            ...(user.phone != null && { phone: user.phone }),
            ...(user.roles !== undefined && { roles: user.roles }),
            ...(user.state !== undefined && { state: user.state }),
            ...(user.last_login !== undefined && { last_login: user.last_login }),
            ...(user.created_date !== undefined && { created_date: user.created_date })
        }));

        return {
            users,
            ...(providerResponse.total !== undefined && { total: providerResponse.total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
