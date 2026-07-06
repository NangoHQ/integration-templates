import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    email: z.string(),
    accessRole: z.string(),
    photo: z.string().nullable().optional(),
    createdAt: z.number(),
    deactivatedAt: z.number().nullable().optional(),
    externalDirectoryId: z.string().nullable().optional(),
    linkedContactIds: z.string().array().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    managerId: z.string().nullable().optional()
});

const GetUsersSchema = z.object({
    users: UserSchema.array()
});

type GetUsers = z.infer<typeof GetUsersSchema>;

const action = createAction({
    description: 'Lists all the users in your Lever account. Only active users are included by default.',
    version: '2.0.0',

    input: z.void(),
    output: GetUsersSchema,

    exec: async (nango): Promise<GetUsers> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-users
            endpoint: '/v1/users',
            retries: 3
        };

        const resp = await nango.get(config);

        const parsed = z.object({ data: UserSchema.array() }).safeParse(resp.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Invalid response from Lever API',
                details: parsed.error.issues
            });
        }

        return {
            users: parsed.data.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
