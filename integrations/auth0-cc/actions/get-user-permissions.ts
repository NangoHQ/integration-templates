import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('Auth0 user ID. Example: "auth0|1234567890"')
});

const PermissionSchema = z.object({
    permission_name: z.string(),
    description: z.string().optional(),
    resource_server_identifier: z.string().optional(),
    resource_server_name: z.string().optional(),
    sources: z.unknown().optional()
});

const OutputSchema = z.object({
    permissions: z.array(PermissionSchema)
});

const action = createAction({
    description: 'Get the permissions assigned to a user in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const allPermissions: z.infer<typeof PermissionSchema>[] = [];

        for await (const pagePermissions of nango.paginate({
            // https://auth0.com/docs/api/management/v2/users/get-permissions
            endpoint: `/api/v2/users/${encodeURIComponent(input.user_id)}/permissions`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        })) {
            for (const p of pagePermissions) {
                allPermissions.push(PermissionSchema.parse(p));
            }
        }

        return {
            permissions: allPermissions
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
