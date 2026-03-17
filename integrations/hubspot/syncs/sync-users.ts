import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    roleId: z.string().optional(),
    primaryTeamId: z.string().optional(),
    secondaryTeamIds: z.array(z.string()),
    superAdmin: z.boolean()
});

const HubspotUserApiSchema = z.object({
    id: z.string(),
    email: z.string().nullish(),
    roleId: z.string().nullish(),
    primaryTeamId: z.string().nullish(),
    secondaryTeamIds: z.array(z.string()).optional(),
    superAdmin: z.union([z.boolean(), z.literal('true'), z.literal('false')]).optional()
});

const sync = createSync({
    description: 'Sync provisioned users with role IDs, primary team, and admin status',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/sync-users', group: 'Users' }],
    frequency: 'every hour',
    autoStart: true,

    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        // https://developers.hubspot.com/docs/api-reference/settings-user-provisioning-v3/users/get-settings-v3-users-
        const proxyConfig = {
            endpoint: '/settings/v3/users/',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'paging.next.after',
                cursor_name_in_request: 'after',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        } satisfies ProxyConfiguration;

        for await (const batch of nango.paginate(proxyConfig)) {
            const users = z.array(HubspotUserApiSchema).parse(batch);
            const records = users.map((user) => ({
                id: user.id,
                email: user.email ?? undefined,
                roleId: user.roleId ?? undefined,
                primaryTeamId: user.primaryTeamId ?? undefined,
                secondaryTeamIds: user.secondaryTeamIds || [],
                superAdmin: user.superAdmin === true || user.superAdmin === 'true'
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'User');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
