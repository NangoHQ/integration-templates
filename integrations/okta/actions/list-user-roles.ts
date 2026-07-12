import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The unique ID of the Okta user. Example: "00u14y5plo5MraBIf698"')
});

const ProviderRoleSchema = z
    .object({
        id: z.string(),
        label: z.string(),
        type: z.string(),
        status: z.string(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        assignmentType: z.string().optional(),
        _links: z.unknown().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    roles: z.array(ProviderRoleSchema)
});

const action = createAction({
    description: 'List the admin roles assigned to a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.roles.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/roles/#list-roles-assigned-to-a-user
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/roles`,
            retries: 3
        });

        const rawRoles = z.array(z.unknown()).parse(response.data);

        const roles = rawRoles.map((role) => {
            return ProviderRoleSchema.parse(role);
        });

        return {
            roles
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
