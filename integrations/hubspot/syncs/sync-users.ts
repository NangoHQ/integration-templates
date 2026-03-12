import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    email: z.union([z.string(), z.null()]),
    role_id: z.union([z.string(), z.null()]),
    primary_team_id: z.union([z.string(), z.null()]),
    secondary_team_ids: z.array(z.string()),
    super_admin: z.boolean()
});

const CheckpointSchema = z.object({
    after: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync provisioned users with role IDs, primary team, and admin status',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/sync-users', group: 'Users' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        let after = checkpoint?.after || undefined;

        while (true) {
            const response = await nango.get<{
                results?: any[];
                paging?: { next?: { after?: string } };
            }>({
                // https://developers.hubspot.com/docs/api-reference/settings-user-provisioning-v3/users/get-settings-v3-users-
                endpoint: '/settings/v3/users/',
                params: {
                    limit: '100',
                    ...(after && { after })
                },
                retries: 3
            });

            const records = (response.data.results ?? []).map((user) => ({
                id: user.id,
                email: user.email ?? null,
                role_id: user.roleId ?? null,
                primary_team_id: user.primaryTeamId ?? null,
                secondary_team_ids: user.secondaryTeamIds || [],
                super_admin: user.superAdmin === true || user.superAdmin === 'true'
            }));

            if (records.length === 0) {
                break;
            }

            await nango.batchSave(records, 'User');

            const nextAfter = response.data.paging?.next?.after;
            if (nextAfter) {
                after = nextAfter;
                await nango.saveCheckpoint({
                    after
                });
                continue;
            }

            break;
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
