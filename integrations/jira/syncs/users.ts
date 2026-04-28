import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    accountId: z.string(),
    accountType: z.string().optional(),
    active: z.boolean().optional(),
    displayName: z.string().optional(),
    emailAddress: z.string().optional(),
    timeZone: z.string().optional(),
    locale: z.string().optional(),
    self: z.string().optional()
});

const MetadataSchema = z.object({
    query: z.string().optional(),
    cloudId: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number(),
    query: z.string()
});

const StoredCheckpointSchema = z.object({
    offset: z.number(),
    query: z.string().optional()
});

const JiraUserSchema = z.object({
    accountId: z.string(),
    accountType: z.string().optional(),
    active: z.boolean().optional(),
    displayName: z.string().optional(),
    emailAddress: z.string().optional(),
    timeZone: z.string().optional(),
    locale: z.string().optional(),
    self: z.string().optional()
});

const sync = createSync({
    description: 'Sync Jira users visible to the authenticated account',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },
    endpoints: [
        {
            path: '/syncs/users',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        // Blocker: Jira Users API does not support filtering by updated_at or modified_since.
        // The /rest/api/3/users/search endpoint returns all users (active, inactive, and previously deleted)
        // but cannot filter by modification time. There is also no dedicated endpoint to retrieve
        // deleted users or changes since a timestamp. Therefore, full refresh with trackDeletes is required.

        const metadataResult = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        const parsedMetadata = MetadataSchema.safeParse(metadataResult);
        const metadata = parsedMetadata.success ? parsedMetadata.data : undefined;
        const currentQuery = metadata?.query ?? '';

        // Get cloudId from metadata or connection config
        // Note: cloudId may be stored in either location depending on the connection setup
        let cloudId = metadata?.cloudId;

        if (!cloudId) {
            const connection = await nango.getConnection();
            cloudId = connection.connection_config?.['cloudId'];
        }

        if (!cloudId) {
            throw new Error('Missing cloudId in connection configuration or metadata');
        }

        await nango.trackDeletesStart('User');

        const parsedCheckpoint = StoredCheckpointSchema.safeParse(await nango.getCheckpoint());
        let currentOffset = parsedCheckpoint.success && (parsedCheckpoint.data.query ?? '') === currentQuery ? parsedCheckpoint.data.offset : 0;
        let resumedFromCheckpoint = currentOffset > 0;
        let sawUsersInRun = false;

        const pageSize = 100;

        while (true) {
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-users-search-get
            const response = await nango.get({
                endpoint: `/ex/jira/${cloudId}/rest/api/3/users/search`,
                params: {
                    ...(currentQuery ? { query: currentQuery } : {}),
                    startAt: currentOffset,
                    maxResults: pageSize
                },
                headers: {
                    'X-Atlassian-Token': 'no-check'
                },
                retries: 3
            });

            const parsedUsers = z.array(JiraUserSchema).safeParse(response.data);
            if (!parsedUsers.success) {
                throw new Error(`Invalid response from Jira users API: ${parsedUsers.error.message}`);
            }

            const page = parsedUsers.data;
            if (page.length === 0) {
                if (resumedFromCheckpoint && !sawUsersInRun) {
                    currentOffset = 0;
                    resumedFromCheckpoint = false;
                    await nango.saveCheckpoint({ offset: 0, query: currentQuery });
                    continue;
                }

                break;
            }

            sawUsersInRun = true;

            const users = page.map((user) => ({
                id: user.accountId,
                accountId: user.accountId,
                ...(user.accountType !== undefined && { accountType: user.accountType }),
                ...(user.active !== undefined && { active: user.active }),
                ...(user.displayName !== undefined && { displayName: user.displayName }),
                ...(user.emailAddress !== undefined && { emailAddress: user.emailAddress }),
                ...(user.timeZone !== undefined && { timeZone: user.timeZone }),
                ...(user.locale !== undefined && { locale: user.locale }),
                ...(user.self !== undefined && { self: user.self })
            }));

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            currentOffset += page.length;
            await nango.saveCheckpoint({ offset: currentOffset, query: currentQuery });

            if (page.length < pageSize) {
                break;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
