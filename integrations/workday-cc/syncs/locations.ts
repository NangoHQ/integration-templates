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

// Workday's Staffing REST API has no dedicated Location master-data resource; the "prompt values"
// endpoint used for job-change location pickers is the closest available substitute (id/descriptor only).
const LocationSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderLocationValueSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderLocationValueSchema).optional(),
    total: z.number().optional()
});

const sync = createSync({
    description: 'Sync locations from Workday.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/locations'
        }
    ],
    models: {
        Location: LocationSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        await nango.trackDeletesStart('Location');

        let offset = 0;
        let total = 0;

        do {
            await nango.log(`Fetching offset ${offset}`);

            // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/values~jobChangesGroup~locations
            const response = await withRetry(() =>
                nango.get({
                    endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/values/jobChangesGroup/locations`,
                    params: { limit: PAGE_SIZE, offset },
                    retries: 3
                })
            );

            const providerResponse = ProviderResponseSchema.parse(response.data);
            const values = providerResponse.data ?? [];
            total = providerResponse.total ?? values.length;

            const locations: z.infer<typeof LocationSchema>[] = values.map((location) => ({
                id: location.id,
                name: location.descriptor ?? ''
            }));

            if (locations.length > 0) {
                await nango.batchSave(locations, 'Location');
            }

            offset += PAGE_SIZE;
        } while (offset < total);

        await nango.trackDeletesEnd('Location');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
