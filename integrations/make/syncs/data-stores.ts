import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DataStoreSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    records: z.number().optional(),
    size: z.string().optional(),
    maxSize: z.string().optional(),
    teamId: z.string().optional()
});

const OrganizationSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const TeamSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const ProviderDataStoreSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    records: z.number().optional(),
    size: z.string().nullable().optional(),
    maxSize: z.string().nullable().optional(),
    teamId: z.number().optional()
});

const sync = createSync({
    description: 'Sync data store metadata (not records) for a team.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        DataStore: DataStoreSchema
    },

    exec: async (nango) => {
        const orgProxyConfig: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/
            endpoint: '/organizations',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'pg[offset]',
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pg[limit]',
                limit: 1000,
                response_path: 'organizations'
            },
            retries: 3
        };

        const teams: Array<z.infer<typeof TeamSchema>> = [];
        for await (const orgPage of nango.paginate<unknown>(orgProxyConfig)) {
            const orgsResult = z.array(OrganizationSchema).safeParse(orgPage);
            if (!orgsResult.success) {
                throw new Error(`Failed to parse organizations page: ${orgsResult.error.message}`);
            }

            for (const org of orgsResult.data) {
                const teamProxyConfig: ProxyConfiguration = {
                    // https://developers.make.com/api-documentation/
                    endpoint: '/teams',
                    params: {
                        organizationId: String(org.id)
                    },
                    paginate: {
                        type: 'offset',
                        offset_name_in_request: 'pg[offset]',
                        offset_calculation_method: 'per-page',
                        limit_name_in_request: 'pg[limit]',
                        limit: 1000,
                        response_path: 'teams'
                    },
                    retries: 3
                };

                for await (const teamPage of nango.paginate<unknown>(teamProxyConfig)) {
                    const teamsResult = z.array(TeamSchema).safeParse(teamPage);
                    if (!teamsResult.success) {
                        throw new Error(`Failed to parse teams page: ${teamsResult.error.message}`);
                    }

                    teams.push(...teamsResult.data);
                }
            }
        }

        await nango.trackDeletesStart('DataStore');

        for (const team of teams) {
            const proxyConfig: ProxyConfiguration = {
                // https://developers.make.com/api-documentation/
                endpoint: '/data-stores',
                params: {
                    teamId: String(team.id),
                    'pg[sortDir]': 'asc'
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'pg[offset]',
                    limit_name_in_request: 'pg[limit]',
                    limit: 100,
                    response_path: 'dataStores'
                },
                retries: 3
            };

            for await (const page of nango.paginate(proxyConfig)) {
                const validatedPage = z.array(ProviderDataStoreSchema).safeParse(page);
                if (!validatedPage.success) {
                    throw new Error(`Failed to parse data stores page: ${validatedPage.error.message}`);
                }

                const dataStores = validatedPage.data.map((record) => ({
                    id: String(record.id),
                    ...(record.name != null && { name: record.name }),
                    ...(record.records !== undefined && { records: record.records }),
                    ...(record.size != null && { size: record.size }),
                    ...(record.maxSize != null && { maxSize: record.maxSize }),
                    ...(record.teamId !== undefined && { teamId: String(record.teamId) })
                }));

                if (dataStores.length > 0) {
                    await nango.batchSave(dataStores, 'DataStore');
                }
            }
        }

        await nango.trackDeletesEnd('DataStore');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
