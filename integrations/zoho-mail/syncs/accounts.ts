import { createSync } from 'nango';
import { z } from 'zod';

const ZohoAccountSchema = z
    .object({
        accountId: z.string(),
        primaryEmailAddress: z.string().optional(),
        displayName: z.string().optional(),
        accountName: z.string().optional(),
        type: z.string().optional(),
        enabled: z.boolean().optional()
    })
    .passthrough();

const ZohoAccountsResponseSchema = z.object({
    data: z.array(z.unknown())
});

const AccountSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    displayName: z.string().optional(),
    accountName: z.string().optional(),
    type: z.string().optional(),
    enabled: z.boolean().optional()
});

function resolveMailBaseUrl(apiDomain: string | undefined): string | undefined {
    if (!apiDomain) {
        return undefined;
    }

    const trimmed = apiDomain.replace(/\/$/, '');

    const apisMatch = trimmed.match(/^https:\/\/www\.zohoapis\.([a-z.]+)$/);
    if (apisMatch) {
        return `https://mail.zoho.${apisMatch[1]}`;
    }

    const mailMatch = trimmed.match(/^https:\/\/mail\.zoho\.([a-z.]+)$/);
    if (mailMatch) {
        return trimmed;
    }

    return undefined;
}

const sync = createSync({
    description: 'Sync all accounts for the authenticated user from Zoho Mail.',
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
        // Blocker: provider only exposes /api/accounts with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        const connection = await nango.getConnection();
        const rawApiDomain = connection.connection_config?.['api_domain'];
        const apiDomain = typeof rawApiDomain === 'string' ? rawApiDomain : undefined;
        const baseUrlOverride = resolveMailBaseUrl(apiDomain);

        // https://www.zoho.com/mail/help/api/get-all-users-accounts.html
        const response = await nango.get({
            endpoint: '/api/accounts',
            baseUrlOverride: baseUrlOverride,
            retries: 3
        });

        const envelope = ZohoAccountsResponseSchema.safeParse(response.data);
        if (!envelope.success) {
            throw new Error('Failed to parse Zoho Mail accounts response envelope');
        }

        await nango.trackDeletesStart('Account');

        const accounts = envelope.data.data.map((raw: unknown) => {
            const parsed = ZohoAccountSchema.safeParse(raw);
            if (!parsed.success) {
                throw new Error('Failed to parse Zoho Mail account record');
            }

            const record = parsed.data;
            return {
                id: record.accountId,
                ...(record.primaryEmailAddress !== undefined && { email: record.primaryEmailAddress }),
                ...(record.displayName !== undefined && { displayName: record.displayName }),
                ...(record.accountName !== undefined && { accountName: record.accountName }),
                ...(record.type !== undefined && { type: record.type }),
                ...(record.enabled !== undefined && { enabled: record.enabled })
            };
        });

        if (accounts.length > 0) {
            await nango.batchSave(accounts, 'Account');
        }

        await nango.trackDeletesEnd('Account');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
