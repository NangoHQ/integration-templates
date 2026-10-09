import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AccountSchema = z.object({
    id: z.number()
});

const ProviderClientSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().nullable().optional(),
    active: z.boolean(),
    external_id: z.string().nullable().optional(),
    updated_at: z.string().optional()
});

const ClientSchema = z
    .object({
        id: z.string().describe('Stable unique record identifier for the client, scoped to its Timely account as "<account_id>-<client_id>".'),
        client_id: z.string().describe("Timely's numeric client ID, represented as a string."),
        account_id: z.string().describe('Timely account ID that owns this client.'),
        name: z.string().describe('Display name of the client.'),
        color: z.string().optional().describe('Hex color assigned to the client in Timely (for example "1976d2").'),
        active: z.boolean().describe('Whether the client is active. Only active clients are synced.'),
        external_id: z.string().optional().describe('Optional external identifier attached to the client.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp of the last update to the client.')
    })
    .describe('An active client (company) in Timely.');

const sync = createSync({
    description: 'Sync all active clients in the connected Timely account(s).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Client: ClientSchema
    },

    exec: async (nango) => {
        // Full refresh: GET /1.1/{account_id}/clients returns the entire (active-only)
        // collection in one bare JSON array. There is no working incremental filter
        // (updated_since is silently ignored) and no confirmed pagination/cursor, so
        // there is no resumable state to checkpoint; delete tracking still requires a
        // full scan on every run.
        const accountConfig: ProxyConfiguration = {
            // Timely API docs: https://developer.timely.com/ (GET /1.1/accounts)
            endpoint: '/1.1/accounts',
            retries: 3
        };
        const accountResponse = await nango.get(accountConfig);
        const accounts = z.array(AccountSchema).parse(accountResponse.data);

        if (accounts.length === 0) {
            throw new Error('No Timely accounts are visible to this connection.');
        }

        // Delete detection must cover every account, so it starts only after the
        // account list (the prerequisite) has been resolved successfully.
        await nango.trackDeletesStart('Client');

        for (const account of accounts) {
            const accountId = String(account.id);
            const clientConfig: ProxyConfiguration = {
                // Timely API docs: https://developer.timely.com/ (GET /1.1/{account_id}/clients)
                endpoint: `/1.1/${encodeURIComponent(accountId)}/clients`,
                retries: 3
            };
            const clientResponse = await nango.get(clientConfig);
            const clients = z.array(ProviderClientSchema).parse(clientResponse.data);

            const records = clients
                .filter((client) => client.active !== false)
                .map((client) => {
                    const clientId = String(client.id);

                    return {
                        id: `${accountId}-${clientId}`,
                        client_id: clientId,
                        account_id: accountId,
                        name: client.name,
                        active: client.active,
                        ...(client.color != null && { color: client.color }),
                        ...(client.external_id != null && { external_id: client.external_id }),
                        ...(client.updated_at != null && { updated_at: client.updated_at })
                    };
                });

            if (records.length > 0) {
                await nango.batchSave(records, 'Client');
            }
        }

        await nango.trackDeletesEnd('Client');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
