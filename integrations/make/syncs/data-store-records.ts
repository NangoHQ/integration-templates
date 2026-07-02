import { createSync } from 'nango';
import { z } from 'zod';

const DataStoreRecordSchema = z.object({
    id: z.string(),
    dataStoreId: z.number(),
    key: z.string(),
    data: z.record(z.string(), z.unknown()).optional()
});

const OrganizationSchema = z.object({
    id: z.number()
});

const OrganizationsResponseSchema = z.object({
    organizations: z.array(OrganizationSchema)
});

const TeamSchema = z.object({
    id: z.number()
});

const TeamsResponseSchema = z.object({
    teams: z.array(TeamSchema)
});

const DataStoreSchema = z.object({
    id: z.number()
});

const DataStoresResponseSchema = z.object({
    dataStores: z.array(DataStoreSchema)
});

const DataStoreRecordItemSchema = z.object({
    key: z.string(),
    data: z.record(z.string(), z.unknown()).optional()
});

const DataStoreRecordsResponseSchema = z.object({
    records: z.array(DataStoreRecordItemSchema)
});

const sync = createSync({
    description: 'Sync records inside each data store for a team.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        DataStoreRecord: DataStoreRecordSchema
    },

    exec: async (nango) => {
        // https://developers.make.com/api-documentation/
        const orgsResponse = await nango.get({
            endpoint: '/organizations',
            params: {
                'cols[1]': 'id'
            },
            retries: 3
        });

        const orgs = OrganizationsResponseSchema.parse(orgsResponse.data);
        const firstOrg = orgs.organizations[0];
        if (!firstOrg) {
            throw new Error('No organizations found');
        }

        const organizationId = firstOrg.id;

        // https://developers.make.com/api-documentation/
        const teamsResponse = await nango.get({
            endpoint: '/teams',
            params: {
                organizationId: organizationId,
                'cols[1]': 'id'
            },
            retries: 3
        });

        const teams = TeamsResponseSchema.parse(teamsResponse.data);
        if (teams.teams.length === 0) {
            throw new Error('No teams found');
        }

        await nango.trackDeletesStart('DataStoreRecord');

        for (const team of teams.teams) {
            // https://developers.make.com/api-documentation/
            const dataStoresResponse = await nango.get({
                endpoint: '/data-stores',
                params: {
                    teamId: team.id,
                    'cols[1]': 'id',
                    'pg[limit]': 100
                },
                retries: 3
            });

            const dataStores = DataStoresResponseSchema.parse(dataStoresResponse.data);

            for (const dataStore of dataStores.dataStores) {
                const limit = 10;
                let offset = 0;
                let hasMore = true;

                while (hasMore) {
                    // https://developers.make.com/api-documentation/
                    const recordsResponse = await nango.get({
                        endpoint: `/data-stores/${encodeURIComponent(String(dataStore.id))}/data`,
                        params: {
                            'pg[limit]': limit,
                            'pg[offset]': offset
                        },
                        retries: 3
                    });

                    const recordsData = DataStoreRecordsResponseSchema.parse(recordsResponse.data);
                    const mappedRecords = recordsData.records.map((record) => ({
                        id: `${dataStore.id}:${record.key}`,
                        dataStoreId: dataStore.id,
                        key: record.key,
                        ...(record.data !== undefined && { data: record.data })
                    }));

                    if (mappedRecords.length > 0) {
                        await nango.batchSave(mappedRecords, 'DataStoreRecord');
                    }

                    if (recordsData.records.length < limit) {
                        hasMore = false;
                    } else {
                        offset += limit;
                    }
                }
            }
        }

        await nango.trackDeletesEnd('DataStoreRecord');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
