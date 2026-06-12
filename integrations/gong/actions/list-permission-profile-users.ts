import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    profileId: z.string().describe('Permission profile identifier. Example: "12345678901234567890"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    fullName: z.string().optional(),
    emailAddress: z.string().optional()
});

const OutputSchema = z.object({
    users: z.array(
        z.object({
            id: z.string(),
            fullName: z.string().optional(),
            emailAddress: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'List all users attached to a specific Gong permission profile',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-permission-profile-users',
        group: 'Permissions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch This endpoint is plan-gated and may return 401/404 when the permission profile API is not available on the account.
        try {
            // https://help.gong.io/apidocs/list-all-users-attached-to-a-given-permission-profile-v2permission-profileusers
            response = await nango.get({
                endpoint: '/v2/permission-profile/users',
                params: {
                    profileId: input.profileId
                },
                retries: 3
            });
        } catch (error) {
            const errorStatus =
                error &&
                typeof error === 'object' &&
                'response' in error &&
                error.response &&
                typeof error.response === 'object' &&
                'status' in error.response &&
                typeof error.response.status === 'number'
                    ? error.response.status
                    : undefined;
            if (errorStatus === 400 || errorStatus === 401 || errorStatus === 404) {
                return {
                    users: []
                };
            }
            throw error;
        }

        const ProviderResponseSchema = z.object({
            requestId: z.string().optional(),
            users: z.array(ProviderUserSchema).optional()
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            users: (parsed.users || []).map((user) => ({
                id: user.id,
                ...(user.fullName !== undefined && { fullName: user.fullName }),
                ...(user.emailAddress !== undefined && { emailAddress: user.emailAddress })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
