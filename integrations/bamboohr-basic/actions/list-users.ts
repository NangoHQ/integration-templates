import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderUserSchema = z.object({
    id: z.number().optional(),
    employeeId: z.number().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    status: z.string().optional(),
    lastLogin: z.string().optional()
});

const ProviderResponseSchema = z.record(z.string(), ProviderUserSchema);

const UserSchema = z.object({
    id: z.number().optional(),
    employeeId: z.number().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    status: z.string().optional(),
    lastLogin: z.string().optional()
});

const OutputSchema = z.object({
    users: z.array(UserSchema)
});

const action = createAction({
    description: 'List BambooHR user accounts.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-users',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/list-users
            endpoint: '/v1/meta/users',
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const users = Object.values(providerResponse).map((user) => ({
            ...(user.id !== undefined && { id: user.id }),
            ...(user.employeeId !== undefined && { employeeId: user.employeeId }),
            ...(user.firstName !== undefined && { firstName: user.firstName }),
            ...(user.lastName !== undefined && { lastName: user.lastName }),
            ...(user.email !== undefined && { email: user.email }),
            ...(user.status !== undefined && { status: user.status }),
            ...(user.lastLogin !== undefined && { lastLogin: user.lastLogin })
        }));

        return { users };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
