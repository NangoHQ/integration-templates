import { createSync } from 'nango';
import { LinearRoadmap } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of roadmaps from Linear',
    version: '2.0.0',
    frequency: 'every 5min',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/roadmaps',
            group: 'Roadmaps'
        }
    ],

    models: {
        LinearRoadmap: LinearRoadmap
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const { lastSyncDate } = nango;
        const pageSize = 50;
        let after = '';

        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            const filterParam = lastSyncDate
                ? `
            , filter: {
                updatedAt: { gte: "${lastSyncDate.toISOString()}" }
            }`
                : '';

            const afterParam = after ? `, after: "${after}"` : '';

            const query = `
            query {
                roadmaps (first: ${pageSize}${afterParam}${filterParam}) {
                    nodes {
                        id
                        name
                        description
                        createdAt
                        updatedAt
                        projects {
                            nodes {
                                id
                            }
                        }
                        organization {
                            teams {
                                nodes {
                                    id
                                }
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }`;

            const response = await nango.post({
                endpoint: '/graphql',
                data: {
                    query: query
                },
                retries: 10
            });

            await nango.batchSave(mapRoadmaps(response.data.data.roadmaps.nodes), 'LinearRoadmap');

            if (!response.data.data.roadmaps.pageInfo.hasNextPage || !response.data.data.roadmaps.pageInfo.endCursor) {
                break;
            } else {
                after = response.data.data.roadmaps.pageInfo.endCursor;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapRoadmaps(records: any[]): LinearRoadmap[] {
    return records.map((record: any) => {
        return {
            id: record.id,
            name: record.name,
            description: record.description,
            createdAt: new Date(record.createdAt).toISOString(),
            updatedAt: new Date(record.updatedAt).toISOString(),
            teamId: record.organization.teams.nodes[0]['id'] || '',
            projectIds: record.projects.nodes.map((project: any) => project.id).join(',')
        };
    });
}
