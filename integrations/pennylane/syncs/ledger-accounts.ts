import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderLedgerAccountSchema = z.object({
    id: z.number(),
    number: z.string(),
    label: z.string(),
    vat_rate: z.string().optional(),
    country_alpha2: z.string().optional(),
    enabled: z.boolean().optional(),
    type: z.string().optional(),
    letterable: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const LedgerAccountSchema = z.object({
    id: z.string(),
    number: z.string(),
    label: z.string(),
    vat_rate: z.string().optional(),
    country_alpha2: z.string().optional(),
    enabled: z.boolean().optional(),
    type: z.string().optional(),
    letterable: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync ledger accounts.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        LedgerAccount: LedgerAccountSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes GET /ledger_accounts with no changed-since filter,
        // no deleted-record endpoint, and no time-based filtering. Full refresh is required.
        await nango.trackDeletesStart('LedgerAccount');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getledgeraccounts
            endpoint: '/api/external/v2/ledger_accounts',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const accounts = page.map((record) => {
                const parsed = ProviderLedgerAccountSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Invalid ledger account record: ${parsed.error.message}`);
                }

                const r = parsed.data;
                const account: z.infer<typeof LedgerAccountSchema> = {
                    id: String(r.id),
                    number: r.number,
                    label: r.label
                };

                if (r.vat_rate != null) {
                    account.vat_rate = r.vat_rate;
                }

                if (r.country_alpha2 != null) {
                    account.country_alpha2 = r.country_alpha2;
                }

                if (r.enabled != null) {
                    account.enabled = r.enabled;
                }

                if (r.type != null) {
                    account.type = r.type;
                }

                if (r.letterable != null) {
                    account.letterable = r.letterable;
                }

                if (r.created_at != null) {
                    account.created_at = r.created_at;
                }

                if (r.updated_at != null) {
                    account.updated_at = r.updated_at;
                }

                return account;
            });

            if (accounts.length > 0) {
                await nango.batchSave(accounts, 'LedgerAccount');
            }
        }

        await nango.trackDeletesEnd('LedgerAccount');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
