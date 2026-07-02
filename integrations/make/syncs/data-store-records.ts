import { createSync, type ProxyConfiguration } from 'nango';
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

const TeamSchema = z.object({
    id: z.number()
});

const DataStoreSchema = z.object({
    id: z.number()
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
        const orgProxyConfig: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/
            endpoint: '/organizations',
            params: {
                'cols[1]': 'id'
            },
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
            const orgs = z.array(OrganizationSchema).parse(orgPage);

            for (const org of orgs) {
                const teamProxyConfig: ProxyConfiguration = {
                    // https://developers.make.com/api-documentation/
                    endpoint: '/teams',
                    params: {
                        organizationId: org.id,
                        'cols[1]': 'id'
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
                    teams.push(...z.array(TeamSchema).parse(teamPage));
                }
            }
        }

        if (teams.length === 0) {
            throw new Error('No teams found');
        }

        await nango.trackDeletesStart('DataStoreRecord');

        for (const team of teams) {
            const dataStores: Array<z.infer<typeof DataStoreSchema>> = [];
            const dataStoreProxyConfig: ProxyConfiguration = {
                // https://developers.make.com/api-documentation/
                endpoint: '/data-stores',
                params: {
                    teamId: team.id,
                    'cols[1]': 'id'
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

            for await (const dataStorePage of nango.paginate<unknown>(dataStoreProxyConfig)) {
                dataStores.push(...z.array(DataStoreSchema).parse(dataStorePage));
            }

            for (const dataStore of dataStores) {
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
