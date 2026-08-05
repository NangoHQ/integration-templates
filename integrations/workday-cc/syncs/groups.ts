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
// Resources API which covered security/matrix/company/cost-center organizations too.
const GroupSchema = z.object({
    id: z.string().describe('Supervisory organization ID'),
    name: z.string(),
    type: z.string().optional(),
    inactive: z.boolean()
});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    inactive: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderOrganizationSchema).optional(),
    total: z.number().optional()
});

const sync = createSync({
    description: 'Sync Workday supervisory organizations as groups.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    models: {
        Group: GroupSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/groups' }],

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        // Blocker: Workday's supervisoryOrganizations resource does not support a modified_since
        // filter. Full refresh with deletion tracking is required.
        await nango.trackDeletesStart('Group');

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

            const groups: z.infer<typeof GroupSchema>[] = organizations.map((org) => ({
                id: org.id,
                name: org.name ?? '',
                type: 'Supervisory',
                inactive: org.inactive ?? false
            }));

            if (groups.length > 0) {
                await nango.batchSave(groups, 'Group');
            }

            offset += PAGE_SIZE;
        } while (offset < total);

        await nango.trackDeletesEnd('Group');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
