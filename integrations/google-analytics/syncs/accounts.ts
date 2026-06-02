import { createSync } from 'nango';
import { z } from 'zod';

const ProviderAccountSchema = z.object({
    name: z.string(),
    createTime: z.string().optional(),
    updateTime: z.string().optional(),
    displayName: z.string().optional(),
    regionCode: z.string().optional(),
    deleted: z.boolean().optional(),
    gmpOrganization: z.string().optional()
});

const AccountsResponseSchema = z.object({
    accounts: z.array(ProviderAccountSchema).optional(),
    nextPageToken: z.string().optional()
});

const AccountSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    createTime: z.string().optional(),
    updateTime: z.string().optional(),
    displayName: z.string().optional(),
    regionCode: z.string().optional(),
    deleted: z.boolean().optional(),
    gmpOrganization: z.string().optional()
});

const AccountsCheckpointSchema = z.object({
    pageToken: z.string()
});

const sync = createSync({
    description: 'Sync accessible Google Analytics accounts.',
    version: '1.0.0',
    // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accounts/list
    endpoints: [{ method: 'GET', path: '/syncs/accounts' }],
    frequency: 'every hour',
    autoStart: true,
    models: {
        Account: AccountSchema
    },
    checkpoint: AccountsCheckpointSchema,

    exec: async (nango) => {
        // accounts.list does not expose a changed-since filter, so this stays a
        // full refresh. We still persist pageToken checkpoints so interrupted
        // runs can resume without restarting from page 1.
        const checkpoint = await nango.getCheckpoint();
        let pageToken = checkpoint?.pageToken;

        await nango.trackDeletesStart('Account');

        while (true) {
            const response = await nango.get({
                // https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accounts/list
                endpoint: '/v1beta/accounts',
                baseUrlOverride: 'https://analyticsadmin.googleapis.com',
                params: {
                    showDeleted: 'true',
                    pageSize: 50,
                    ...(pageToken ? { pageToken } : {})
                },
                retries: 3
            });

            const parsedResponse = AccountsResponseSchema.parse(response.data);
            const rawAccounts = parsedResponse.accounts ?? [];

            if (rawAccounts.length === 0) {
                if (!parsedResponse.nextPageToken) {
                    break;
                }

                pageToken = parsedResponse.nextPageToken;
                await nango.saveCheckpoint({ pageToken });
                continue;
            }

            const accounts = rawAccounts.map((account) => {
                const id = account.name.replace(/^accounts\//, '');

                return {
                    id,
                    name: account.name,
                    ...(account.displayName !== undefined && { displayName: account.displayName }),
                    ...(account.createTime !== undefined && { createTime: account.createTime }),
                    ...(account.updateTime !== undefined && { updateTime: account.updateTime }),
                    ...(account.regionCode !== undefined && { regionCode: account.regionCode }),
                    ...(account.deleted !== undefined && { deleted: account.deleted }),
                    ...(account.gmpOrganization !== undefined && { gmpOrganization: account.gmpOrganization })
                };
            });

            await nango.batchSave(accounts, 'Account');

            pageToken = parsedResponse.nextPageToken;
            if (!pageToken) {
                break;
            }

            await nango.saveCheckpoint({ pageToken });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Account');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
