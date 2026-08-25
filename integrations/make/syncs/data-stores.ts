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

const CheckpointSchema = z.object({
    orgOffset: z.number(),
    teamOffset: z.number(),
    dataStoreOffset: z.number()
});

const sync = createSync({
    description: 'Sync data store metadata (not records) for a team.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        DataStore: DataStoreSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let orgOffset = typeof checkpoint?.['orgOffset'] === 'number' ? checkpoint['orgOffset'] : 0;
        let teamOffset = typeof checkpoint?.['teamOffset'] === 'number' ? checkpoint['teamOffset'] : 0;
        let dataStoreOffset = typeof checkpoint?.['dataStoreOffset'] === 'number' ? checkpoint['dataStoreOffset'] : 0;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('DataStore');

        while (true) {
            const orgProxyConfig: ProxyConfiguration = {
                // https://developers.make.com/api-documentation/
                endpoint: '/organizations',
                params: {
                    'pg[offset]': orgOffset,
                    'pg[limit]': 1000
                },
                retries: 3
            };

            const orgResponse = await nango.get(orgProxyConfig);
            const orgsResult = z.array(OrganizationSchema).safeParse(orgResponse.data.organizations);
            if (!orgsResult.success) {
                throw new Error(`Failed to parse organizations page: ${orgsResult.error.message}`);
            }

            if (orgsResult.data.length === 0) {
                break;
            }

            for (const org of orgsResult.data) {
                while (true) {
                    const teamProxyConfig: ProxyConfiguration = {
                        // https://developers.make.com/api-documentation/
                        endpoint: '/teams',
                        params: {
                            organizationId: String(org.id),
                            'pg[offset]': teamOffset,
                            'pg[limit]': 1000
                        },
                        retries: 3
                    };

                    const teamResponse = await nango.get(teamProxyConfig);
                    const teamsResult = z.array(TeamSchema).safeParse(teamResponse.data.teams);
                    if (!teamsResult.success) {
                        throw new Error(`Failed to parse teams page: ${teamsResult.error.message}`);
                    }

                    if (teamsResult.data.length === 0) {
                        teamOffset = 0;
                        await nango.saveCheckpoint({
                            orgOffset,
                            teamOffset,
                            dataStoreOffset: 0
                        });
                        break;
                    }

                    for (const team of teamsResult.data) {
                        while (true) {
                            const dsProxyConfig: ProxyConfiguration = {
                                // https://developers.make.com/api-documentation/
                                endpoint: '/data-stores',
                                params: {
                                    teamId: String(team.id),
                                    'pg[sortDir]': 'asc',
                                    'pg[offset]': dataStoreOffset,
                                    'pg[limit]': 100
                                },
                                retries: 3
                            };

                            const dsResponse = await nango.get(dsProxyConfig);
                            const validatedPage = z.array(ProviderDataStoreSchema).safeParse(dsResponse.data.dataStores);
                            if (!validatedPage.success) {
                                throw new Error(`Failed to parse data stores page: ${validatedPage.error.message}`);
                            }

                            if (validatedPage.data.length === 0) {
                                dataStoreOffset = 0;
                                await nango.saveCheckpoint({
                                    orgOffset,
                                    teamOffset,
                                    dataStoreOffset
                                });
                                break;
                            }

                            const dataStores = validatedPage.data.map((record) => ({
                                id: String(record.id),
                                ...(record.name != null && { name: record.name }),
                                ...(record.records !== undefined && { records: record.records }),
                                ...(record.size != null && { size: record.size }),
                                ...(record.maxSize != null && { maxSize: record.maxSize }),
                                ...(record.teamId !== undefined && { teamId: String(record.teamId) })
                            }));

                            await nango.batchSave(dataStores, 'DataStore');
                            dataStoreOffset += validatedPage.data.length;
                            await nango.saveCheckpoint({
                                orgOffset,
                                teamOffset,
                                dataStoreOffset
                            });

                            if (validatedPage.data.length < 100) {
                                dataStoreOffset = 0;
                                await nango.saveCheckpoint({
                                    orgOffset,
                                    teamOffset,
                                    dataStoreOffset
                                });
                                break;
                            }
                        }
                    }

                    teamOffset += teamsResult.data.length;
                    await nango.saveCheckpoint({
                        orgOffset,
                        teamOffset,
                        dataStoreOffset: 0
                    });
                }
            }

            orgOffset += orgsResult.data.length;
            await nango.saveCheckpoint({
                orgOffset,
                teamOffset: 0,
                dataStoreOffset: 0
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('DataStore');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
