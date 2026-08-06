import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().optional(),
    surname: z.string().optional(),
    type: z.string(),
    userStatus: z.string(),
    emergencyContact: z.boolean().optional()
});

const ListUsersResponseSchema = z.object({
    count: z.number(),
    items: z.array(
        z.object({
            uid: z.string(),
            email: z.string(),
            name: z.string().optional(),
            surname: z.string().optional(),
            type: z.string(),
            userStatus: z.string(),
            emergencyContact: z.boolean().optional()
        })
    )
});

const AccountUuidSchema = z.object({
    accountUuid: z.string()
});

const sync = createSync({
    description: 'Sync users in this Dynatrace account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const metadata = await nango.getMetadata();

        let accountUuid: string | undefined;
        const parsedConnectionConfig = AccountUuidSchema.safeParse(connection.connection_config);
        if (parsedConnectionConfig.success) {
            accountUuid = parsedConnectionConfig.data.accountUuid;
        } else {
            const parsedMetadata = AccountUuidSchema.safeParse(metadata);
            if (parsedMetadata.success) {
                accountUuid = parsedMetadata.data.accountUuid;
            }
        }

        if (!accountUuid) {
            throw new Error('Missing accountUuid in connection config or metadata');
        }

        await nango.trackDeletesStart('User');

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/user-management-api/accounts-users/get-all-users
        const response = await nango.get({
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/users`,
            retries: 3
        });

        const parsed = ListUsersResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new Error(`Failed to parse list-users response: ${parsed.error.message}`);
        }

        const users = parsed.data.items.map((user) => ({
            id: user.uid,
            email: user.email,
            ...(user.name != null && user.name !== '' && { name: user.name }),
            ...(user.surname != null && user.surname !== '' && { surname: user.surname }),
            type: user.type,
            userStatus: user.userStatus,
            ...(user.emergencyContact != null && { emergencyContact: user.emergencyContact })
        }));

        if (users.length > 0) {
            await nango.batchSave(users, 'User');
        }

        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
