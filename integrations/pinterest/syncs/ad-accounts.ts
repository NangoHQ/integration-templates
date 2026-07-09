import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AdAccountOwnerSchema = z.object({
    id: z.string().optional(),
    username: z.string().optional()
});

const AdAccountSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    country: z.string().optional(),
    currency: z.string().optional(),
    time_zone: z.string().optional(),
    created_time: z.number().int().optional(),
    updated_time: z.number().int().optional(),
    owner: AdAccountOwnerSchema.optional(),
    permissions: z.array(z.string()).optional()
});

const RecordSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    country: z.string().optional(),
    currency: z.string().optional(),
    time_zone: z.string().optional(),
    created_time: z.number().int().optional(),
    updated_time: z.number().int().optional(),
    owner_id: z.string().optional(),
    owner_username: z.string().optional(),
    permissions: z.array(z.string()).optional()
});

const sync = createSync({
    description: 'Sync ad accounts.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        AdAccount: RecordSchema
    },

    exec: async (nango) => {
        // Accessible ad accounts can change as the connected user's permissions change.
        // Keep this as a full crawl with delete tracking so removals are reconciled correctly.
        const proxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_accounts/list
            endpoint: '/v5/ad_accounts',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'bookmark',
                cursor_path_in_response: 'bookmark',
                response_path: 'items',
                limit_name_in_request: 'page_size',
                limit: 2
            },
            retries: 3
        };

        await nango.trackDeletesStart('AdAccount');

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedPage = z.array(z.unknown()).safeParse(page);
            if (!parsedPage.success) {
                throw new Error('Failed to parse paginated page as array');
            }

            const accounts: z.infer<typeof RecordSchema>[] = [];
            for (const raw of parsedPage.data) {
                const parsed = AdAccountSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse ad account: ${parsed.error.message}`);
                }

                const account = parsed.data;
                accounts.push({
                    id: account.id,
                    ...(account.name !== undefined && { name: account.name }),
                    ...(account.country !== undefined && { country: account.country }),
                    ...(account.currency !== undefined && { currency: account.currency }),
                    ...(account.time_zone !== undefined && { time_zone: account.time_zone }),
                    ...(account.created_time !== undefined && { created_time: account.created_time }),
                    ...(account.updated_time !== undefined && { updated_time: account.updated_time }),
                    ...(account.owner?.id !== undefined && { owner_id: account.owner.id }),
                    ...(account.owner?.username !== undefined && { owner_username: account.owner.username }),
                    ...(account.permissions !== undefined && { permissions: account.permissions })
                });
            }

            if (accounts.length > 0) {
                await nango.batchSave(accounts, 'AdAccount');
            }
        }

        await nango.trackDeletesEnd('AdAccount');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
