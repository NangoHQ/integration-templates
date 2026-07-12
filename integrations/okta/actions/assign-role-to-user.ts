import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "00u14y5o7tvvw1qA0698"'),
    type: z
        .enum([
            'SUPER_ADMIN',
            'ORG_ADMIN',
            'APP_ADMIN',
            'USER_ADMIN',
            'GROUP_ADMIN',
            'READ_ONLY_ADMIN',
            'MOBILE_ADMIN',
            'HELP_DESK_ADMIN',
            'REPORT_ADMIN',
            'API_ACCESS_MANAGEMENT_ADMIN'
        ])
        .describe('Standard Okta admin role type enum value')
});

const ProviderRoleSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        status: z.string().optional(),
        created: z.string().optional(),
        lastUpdated: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        status: z.string().optional(),
        created: z.string().optional(),
        lastUpdated: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Assign an admin role to a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.roles.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/roles/#assign-role-to-user
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/roles`,
            data: {
                type: input.type
            },
            retries: 3
        });

        const providerRole = ProviderRoleSchema.parse(response.data);

        return {
            id: providerRole.id,
            type: providerRole.type,
            ...(providerRole.status !== undefined && { status: providerRole.status }),
            ...(providerRole.created !== undefined && { created: providerRole.created }),
            ...(providerRole.lastUpdated !== undefined && { lastUpdated: providerRole.lastUpdated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
