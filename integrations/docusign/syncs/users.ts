import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    userName: z.string().optional(),
    email: z.string().optional(),
    userStatus: z.string().optional(),
    userType: z.string().optional(),
    createdDateTime: z.string().optional(),
    activationDateTime: z.string().optional(),
    lastLoginDateTime: z.string().optional()
});

const ProviderUserSchema = z.object({
    userId: z.string(),
    userName: z.string().nullish(),
    email: z.string().nullish(),
    userStatus: z.string().nullish(),
    userType: z.string().nullish(),
    createdDateTime: z.string().nullish(),
    activationDateTime: z.string().nullish(),
    lastLoginDateTime: z.string().nullish()
});

const MetadataSchema = z.object({
    accountId: z.string()
});

const CheckpointSchema = z.object({
    start_position: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync account users with full-refresh delete tracking.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },
    endpoints: [
        {
            path: '/syncs/users',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('accountId is required in connection metadata');
        }
        const accountId = parsedMetadata.data.accountId;

        const rawCheckpoint = await nango.getCheckpoint();
        let startPosition = 0;
        if (rawCheckpoint !== null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            startPosition = parsedCheckpoint.data.start_position;
        }

        if (startPosition === 0) {
            await nango.trackDeletesStart('User');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/users/getusers/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/users`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'start_position',
                offset_start_value: startPosition,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'users'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const users = [];
            for (const record of page) {
                const parsed = ProviderUserSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse user record: ${parsed.error.message}`);
                }
                const user = parsed.data;
                users.push({
                    id: user.userId,
                    ...(user.userName != null && { userName: user.userName }),
                    ...(user.email != null && { email: user.email }),
                    ...(user.userStatus != null && { userStatus: user.userStatus }),
                    ...(user.userType != null && { userType: user.userType }),
                    ...(user.createdDateTime != null && { createdDateTime: user.createdDateTime }),
                    ...(user.activationDateTime != null && { activationDateTime: user.activationDateTime }),
                    ...(user.lastLoginDateTime != null && { lastLoginDateTime: user.lastLoginDateTime })
                });
            }

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            startPosition += page.length;
            await nango.saveCheckpoint({ start_position: startPosition });
        }

        await nango.trackDeletesEnd('User');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
