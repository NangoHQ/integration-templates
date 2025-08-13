import { createSync } from 'nango';
import { LinearProject } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of projects from Linear',
    version: '2.0.0',
    frequency: 'every 5min',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/projects',
            group: 'Projects'
        }
    ],

    models: {
        LinearProject: LinearProject
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
                projects (first: ${pageSize}${afterParam}${filterParam}) {
                    nodes {
                        id
                        name
                        url
                        description
                        teams {
                            nodes {
                                id
                            }
                        }
                        createdAt
                        updatedAt
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }`;

            const response = await nango.post({
                baseUrlOverride: 'https://api.linear.app',
                endpoint: '/graphql',
                data: {
                    query: query
                },
                retries: 10
            });

            await nango.batchSave(mapProjects(response.data.data.projects.nodes), 'LinearProject');

            if (!response.data.data.projects.pageInfo.hasNextPage || !response.data.data.projects.pageInfo.endCursor) {
                break;
            } else {
                after = response.data.data.projects.pageInfo.endCursor;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapProjects(records: any[]): LinearProject[] {
    return records.map((record: any) => {
        return {
            id: record.id,
            name: record.name,
            url: record.url,
            description: record.description,
            createdAt: new Date(record.createdAt).toISOString(),
            updatedAt: new Date(record.updatedAt).toISOString(),
            teamId: record.teams.nodes[0]['id'] || ''
        };
    });
}
