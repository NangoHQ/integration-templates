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

const OrganizationsResponseSchema = z
    .object({
        organizations: z.array(OrganizationSchema)
    })
    .passthrough();

const TeamsResponseSchema = z
    .object({
        teams: z.array(TeamSchema)
    })
    .passthrough();

const sync = createSync({
    description: 'Sync data store metadata (not records) for a team.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        DataStore: DataStoreSchema
    },

    exec: async (nango) => {
        // https://developers.make.com/api-documentation/
        const orgsResponse = await nango.get({
            endpoint: '/organizations',
            params: {
                'pg[limit]': 1000
            },
            retries: 3
        });

        const orgsResult = OrganizationsResponseSchema.safeParse(orgsResponse.data);
        if (!orgsResult.success) {
            throw new Error(`Failed to parse organizations response: ${orgsResult.error.message}`);
        }

        const organizations = orgsResult.data.organizations;

        const teams: Array<z.infer<typeof TeamSchema>> = [];
        for (const org of organizations) {
            // https://developers.make.com/api-documentation/
            const teamsResponse = await nango.get({
                endpoint: '/teams',
                params: {
                    organizationId: String(org.id),
                    'pg[limit]': 1000
                },
                retries: 3
            });

            const teamsResult = TeamsResponseSchema.safeParse(teamsResponse.data);
            if (!teamsResult.success) {
                throw new Error(`Failed to parse teams response: ${teamsResult.error.message}`);
            }

            teams.push(...teamsResult.data.teams);
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
