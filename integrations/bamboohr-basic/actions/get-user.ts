import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('BambooHR user ID. Example: "123"')
});

const ProviderUserSchema = z.object({
    id: z.union([z.number(), z.string()]).optional(),
    employeeId: z.union([z.number(), z.string()]).nullable().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    status: z.string().optional(),
    lastLogin: z.string().optional()
});

const OutputSchema = z.object({
    id: z.union([z.number(), z.string()]).optional(),
    employeeId: z.union([z.number(), z.string()]).optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    status: z.string().optional(),
    lastLogin: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single BambooHR user account.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/list-users
            endpoint: '/v1/meta/users',
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const usersMap = z.record(z.string(), z.unknown()).parse(response.data);
        const rawUser = usersMap[input.userId];

        if (!rawUser) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                userId: input.userId
            });
        }

        const providerUser = ProviderUserSchema.parse(rawUser);

        return {
            ...(providerUser.id !== undefined && { id: providerUser.id }),
            ...(providerUser.employeeId != null && { employeeId: providerUser.employeeId }),
            ...(providerUser.firstName !== undefined && { firstName: providerUser.firstName }),
            ...(providerUser.lastName !== undefined && { lastName: providerUser.lastName }),
            ...(providerUser.email !== undefined && { email: providerUser.email }),
            ...(providerUser.status !== undefined && { status: providerUser.status }),
            ...(providerUser.lastLogin !== undefined && { lastLogin: providerUser.lastLogin })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
