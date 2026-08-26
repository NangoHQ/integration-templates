import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountUrl: z.string().nullable(),
    createdTimestamp: z.string(),
    updatedTimestamp: z.string(),
    owner: z.string(),
    contactCount: z.string(),
    dealCount: z.string()
});

const AccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    account_url: z.string().optional(),
    created_timestamp: z.string(),
    updated_timestamp: z.string(),
    owner: z.string(),
    contact_count: z.string(),
    deal_count: z.string()
});

const sync = createSync({
    description: 'Sync accounts from ActiveCampaign',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/accounts',
            method: 'GET'
        }
    ],
    models: {
        Account: AccountSchema
    },

    exec: async (nango) => {
        // Blocker: ActiveCampaign GET /3/accounts only documents search (by name)
        // and count_deals query parameters. No changed-since filter, deleted-record
        // endpoint, or resumable cursor exists for accounts.
        await nango.trackDeletesStart('Account');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.activecampaign.com/reference/list-all-accounts
            endpoint: '/3/accounts',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'accounts'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawAccounts = z.array(ProviderAccountSchema).safeParse(page);
            if (!rawAccounts.success) {
                throw new Error(`Failed to parse accounts: ${rawAccounts.error.message}`);
            }

            const accounts = rawAccounts.data.map((record) => ({
                id: record.id,
                name: record.name,
                ...(record.accountUrl != null && { account_url: record.accountUrl }),
                created_timestamp: record.createdTimestamp,
                updated_timestamp: record.updatedTimestamp,
                owner: record.owner,
                contact_count: record.contactCount,
                deal_count: record.dealCount
            }));

            if (accounts.length > 0) {
                await nango.batchSave(accounts, 'Account');
            }
        }

        await nango.trackDeletesEnd('Account');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
