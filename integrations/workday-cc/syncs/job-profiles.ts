import { createSync } from 'nango';
import { z } from 'zod';

const STAFFING_API_VERSION = 'v6';
const PAGE_SIZE = 100;

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
        // @allowTryCatch
        try {
            return await fn();
        } catch (err) {
            if (attempt === retries - 1) throw err;
            await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
    }
    throw new Error('unreachable');
}

// The jobProfiles list endpoint only returns a summary view (id/name/inactive) — management level,
// job family, and job category are only available from the per-profile detail endpoint, which isn't
// fetched here to avoid an N+1 call per profile on every sync run.
const JobProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    active: z.boolean()
});

const ProviderJobProfileSummarySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    inactive: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderJobProfileSummarySchema).optional(),
    total: z.number().optional()
});

const sync = createSync({
    description: 'Sync job profiles from Workday.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        JobProfile: JobProfileSchema
    },

    endpoints: [{ method: 'POST', path: '/syncs/job-profiles' }],

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        // Blocker: jobProfiles has no incremental filter; full refresh required.
        await nango.trackDeletesStart('JobProfile');

        let offset = 0;
        let total = 0;

        do {
            await nango.log(`Fetching offset ${offset}`);

            // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/jobProfiles
            const response = await withRetry(() =>
                nango.get({
                    endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/jobProfiles`,
                    params: { limit: PAGE_SIZE, offset, includeInactive: 'true' },
                    retries: 3
                })
            );

            const providerResponse = ProviderResponseSchema.parse(response.data);
            const summaries = providerResponse.data ?? [];
            total = providerResponse.total ?? summaries.length;

            const mapped: z.infer<typeof JobProfileSchema>[] = summaries.map((summary) => ({
                id: summary.id,
                name: summary.name ?? '',
                active: summary.inactive !== true
            }));

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'JobProfile');
            }

            offset += PAGE_SIZE;
        } while (offset < total);

        await nango.trackDeletesEnd('JobProfile');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
