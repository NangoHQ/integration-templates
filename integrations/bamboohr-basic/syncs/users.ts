import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string().describe('BambooHR user ID'),
    employeeId: z.number().optional().describe('Associated employee ID'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    status: z.string().optional().describe('Account status, e.g. enabled or disabled'),
    lastLogin: z.string().optional().describe('ISO 8601 timestamp of last login')
});

const ProviderUserSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    employeeId: z.number().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    status: z.string().optional(),
    lastLogin: z.string().optional()
});

const ProviderUsersResponseSchema = z.record(z.string(), ProviderUserSchema);

const sync = createSync({
    description: 'Sync BambooHR user accounts.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/users' }],
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        // Blocker: the users endpoint returns the full user list with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor. lastLogin is exposed but is not
        // a reliable change tracking field because not every user has a lastLogin value.
        await nango.trackDeletesStart('User');

        // https://documentation.bamboohr.com/reference/list-users
        const response = await nango.get({
            endpoint: '/v1/meta/users',
            headers: { Accept: 'application/json' },
            retries: 3
        });

        const parseResult = ProviderUsersResponseSchema.safeParse(response.data);
        if (!parseResult.success) {
            throw new Error('Invalid users response shape');
        }

        const usersMap = parseResult.data;
        const users: z.infer<typeof UserSchema>[] = [];

        for (const [userId, rawUser] of Object.entries(usersMap)) {
            const id = typeof rawUser['id'] === 'string' ? rawUser['id'] : typeof rawUser['id'] === 'number' ? String(rawUser['id']) : userId;

            users.push({
                id,
                ...(rawUser['employeeId'] !== undefined && { employeeId: rawUser['employeeId'] }),
                ...(rawUser['firstName'] !== undefined && { firstName: rawUser['firstName'] }),
                ...(rawUser['lastName'] !== undefined && { lastName: rawUser['lastName'] }),
                ...(rawUser['email'] !== undefined && { email: rawUser['email'] }),
                ...(rawUser['status'] !== undefined && { status: rawUser['status'] }),
                ...(rawUser['lastLogin'] !== undefined && { lastLogin: rawUser['lastLogin'] })
            });
        }

        if (users.length > 0) {
            await nango.batchSave(users, 'User');
        }

        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
