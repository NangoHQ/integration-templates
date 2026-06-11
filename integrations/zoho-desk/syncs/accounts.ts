import { createSync, ProxyConfiguration } from 'nango';
import * as z from 'zod';

const LIMIT = 100;

const accountSchema = z.object({
    id: z.string().describe('The unique identifier of the account'),
    accountName: z.string().describe('The name of the account'),
    email: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    country: z.string().optional(),
    industry: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    ownerId: z.string().optional(),
    crmAccountId: z.string().optional()
});

type Account = z.infer<typeof accountSchema>;

const providerAccountSchema = z.object({
    id: z.string(),
    accountName: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    country: z.string().optional(),
    industry: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    ownerId: z.string().optional(),
    zcrmAccountId: z.string().optional()
});

const sync = createSync({
    description: 'Sync accounts',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/accounts', group: 'Accounts' }],
    frequency: 'every hour',
    autoStart: true,
    models: {
        Account: accountSchema
    },
    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const metadataSchema = z.object({
            orgId: z.string().optional()
        });
        const parsedMetadata = metadataSchema.safeParse(metadata);
        const orgId = parsedMetadata.success ? (parsedMetadata.data.orgId ?? '') : '';

        await nango.trackDeletesStart('Account');

        const proxyConfig: ProxyConfiguration = {
            // https://desk.zoho.com/DeskAPIDocument#Accounts-ListAccounts
            endpoint: '/v1/accounts',
            retries: 3,
            headers: {
                orgId: orgId
            },
            paginate: {
                type: 'offset',
                limit: LIMIT,
                limit_name_in_request: 'limit',
                offset_name_in_request: 'from',
                offset_start_value: 0,
                response_path: 'data'
            }
        };

        for await (const accountBatch of nango.paginate(proxyConfig)) {
            const mappedAccounts: Account[] = [];
            for (const item of accountBatch) {
                const parsed = providerAccountSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse account: ${parsed.error.message}`);
                }
                const providerAccount = parsed.data;
                mappedAccounts.push({
                    id: providerAccount.id,
                    accountName: providerAccount.accountName,
                    email: providerAccount.email,
                    phone: providerAccount.phone,
                    website: providerAccount.website,
                    country: providerAccount.country,
                    industry: providerAccount.industry,
                    createdTime: providerAccount.createdTime,
                    modifiedTime: providerAccount.modifiedTime,
                    ownerId: providerAccount.ownerId,
                    crmAccountId: providerAccount.zcrmAccountId
                });
            }

            if (mappedAccounts.length > 0) {
                await nango.batchSave(mappedAccounts, 'Account');
            }
        }

        await nango.trackDeletesEnd('Account');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
