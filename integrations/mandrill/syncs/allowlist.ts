import { createSync } from 'nango';
import { z } from 'zod';

const ProviderAllowlistEntrySchema = z.object({
    email: z.string(),
    detail: z.string().optional(),
    created_at: z.string().optional()
});

const AllowlistEntrySchema = z.object({
    id: z.string(),
    email: z.string(),
    detail: z.string().optional(),
    created_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync all entries on the rejection allowlist.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        AllowlistEntry: AllowlistEntrySchema
    },

    exec: async (nango) => {
        // Blocker: POST /allowlists/list returns the full collection in a single
        // call with no pagination parameters and no modified-since filter documented.
        // https://mailchimp.com/developer/transactional/api/allowlists/list-allowlist/
        const response = await nango.post({
            endpoint: '/1.0/allowlists/list.json',
            retries: 3
        });

        const rawEntries = z.array(ProviderAllowlistEntrySchema).parse(response.data);

        const entries = rawEntries.map((entry) => ({
            id: entry.email,
            email: entry.email,
            ...(entry.detail != null && { detail: entry.detail }),
            ...(entry.created_at != null && { created_at: entry.created_at })
        }));

        await nango.trackDeletesStart('AllowlistEntry');
        if (entries.length > 0) {
            await nango.batchSave(entries, 'AllowlistEntry');
        }

        await nango.trackDeletesEnd('AllowlistEntry');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
