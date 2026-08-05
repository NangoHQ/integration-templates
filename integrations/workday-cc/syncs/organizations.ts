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

// Workday's Staffing REST API only exposes Supervisory Organizations, unlike the SOAP Human
// Resources API which covered every organization type (company, cost center, matrix, etc.) — so
// this sync and the "groups" sync read from the same underlying resource.
const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    inactive: z.boolean(),
    external_id: z.string().optional()
});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    code: z.string().optional(),
    inactive: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderOrganizationSchema).optional(),
    total: z.number().optional()
});

const sync = createSync({
    description: 'Sync organizations from Workday.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/organizations' }],
    models: {
        Organization: OrganizationSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        // Blocker: Workday's supervisoryOrganizations resource does not support modified_since filtering.
        await nango.trackDeletesStart('Organization');

        let offset = 0;
        let total = 0;

        do {
            await nango.log(`Fetching offset ${offset}`);

            // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/supervisoryOrganizations
            const response = await withRetry(() =>
                nango.get({
                    endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/supervisoryOrganizations`,
                    params: { limit: PAGE_SIZE, offset, includeInactive: 'true' },
                    retries: 3
                })
            );

            const providerResponse = ProviderResponseSchema.parse(response.data);
            const organizations = providerResponse.data ?? [];
            total = providerResponse.total ?? organizations.length;

            const mapped: z.infer<typeof OrganizationSchema>[] = organizations.map((org) => ({
                id: org.id,
                name: org.name ?? '',
                type: 'Supervisory',
                inactive: org.inactive ?? false,
                external_id: org.code
            }));

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Organization');
            }

            offset += PAGE_SIZE;
        } while (offset < total);

        await nango.trackDeletesEnd('Organization');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
