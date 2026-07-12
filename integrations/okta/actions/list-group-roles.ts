import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('The unique identifier of the group. Example: "00g14y5qi7zRLgyzT698"')
});

const RoleSchema = z
    .object({
        id: z.string(),
        label: z.string(),
        type: z.string(),
        status: z.string(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        assignmentType: z.string().optional(),
        resourceSet: z.string().nullable().optional(),
        roleType: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    roles: z.array(RoleSchema)
});

const action = createAction({
    description: 'List the admin roles assigned to a group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.roles.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.okta.com/docs/reference/api/roles/#list-group-assigned-roles
        const response = await nango.get({
            endpoint: `/api/v1/groups/${encodeURIComponent(input.groupId)}/roles`,
            retries: 3
        });

        const roles = z.array(z.unknown()).parse(response.data);
        const parsedRoles = roles.map((role) => RoleSchema.parse(role));

        return {
            roles: parsedRoles
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
