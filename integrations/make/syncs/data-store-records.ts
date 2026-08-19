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

const CheckpointSchema = z.object({
    dataStoreId: z.number(),
    offset: z.number()
});

const sync = createSync({
    description: 'Sync records inside each data store for a team.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        DataStoreRecord: DataStoreRecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const rawDataStoreId = checkpoint?.['dataStoreId'];
        const rawOffset = checkpoint?.['offset'];
        const checkpointDataStoreId = typeof rawDataStoreId === 'number' && Number.isFinite(rawDataStoreId) ? rawDataStoreId : undefined;
        const checkpointOffset = typeof rawOffset === 'number' && Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

        const orgProxyConfig: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/
            endpoint: '/organizations',
            params: {
                'cols[1]': 'id'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'pg[offset]',
                offset_calculation_method: 'by-response-size',
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
                        offset_calculation_method: 'by-response-size',
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

        const allDataStores: Array<z.infer<typeof DataStoreSchema>> = [];
        for (const team of teams) {
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
                allDataStores.push(...z.array(DataStoreSchema).parse(dataStorePage));
            }
        }

        let checkpointId = checkpointDataStoreId;
        let checkpointPageOffset = checkpointOffset;
        if (checkpointId !== undefined) {
            const checkpointValid = allDataStores.some((ds) => ds.id === checkpointId);
            if (!checkpointValid) {
                checkpointId = undefined;
                checkpointPageOffset = 0;
            }
        }

        await nango.trackDeletesStart('DataStoreRecord');

        let foundCheckpoint = checkpointId === undefined;

        for (let i = 0; i < allDataStores.length; i++) {
            const dataStore = allDataStores[i];
            if (!dataStore) {
                continue;
            }

            if (!foundCheckpoint) {
                if (dataStore.id === checkpointId) {
                    foundCheckpoint = true;
                } else {
                    continue;
                }
            }

            const limit = 10;
            let offset = dataStore.id === checkpointId ? checkpointPageOffset : 0;

            while (true) {
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
                    const nextDataStore = i + 1 < allDataStores.length ? allDataStores[i + 1] : undefined;
                    if (nextDataStore) {
                        await nango.saveCheckpoint({
                            dataStoreId: nextDataStore.id,
                            offset: 0
                        });
                    } else {
                        await nango.saveCheckpoint({
                            dataStoreId: dataStore.id,
                            offset: offset + limit
                        });
                    }
                    break;
                } else {
                    offset += limit;
                    await nango.saveCheckpoint({
                        dataStoreId: dataStore.id,
                        offset
                    });
                }
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('DataStoreRecord');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
