import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('Auth0 user ID. Example: "auth0|123456789"')
});

const RoleSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional()
});

const OutputSchema = z.object({
    roles: z.array(RoleSchema)
});

const action = createAction({
    description: 'Get the roles assigned to a user in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:users', 'read:roles', 'read:role_members'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const allRoles: z.infer<typeof RoleSchema>[] = [];

        for await (const batch of nango.paginate({
            // https://auth0.com/docs/api/management/v2/users/get-user-roles
            endpoint: `/api/v2/users/${encodeURIComponent(input.user_id)}/roles`,
            params: {
                include_totals: 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'roles'
            },
            retries: 3
        })) {
            const items = z
                .array(
                    z.object({
                        id: z.string(),
                        name: z.string().optional(),
                        description: z.string().optional()
                    })
                )
                .parse(batch);

            for (const item of items) {
                allRoles.push({
                    id: item.id,
                    ...(item.name !== undefined && { name: item.name }),
                    ...(item.description !== undefined && { description: item.description })
                });
            }
        }

        return {
            roles: allRoles
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
