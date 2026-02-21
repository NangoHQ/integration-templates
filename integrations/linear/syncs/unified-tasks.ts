import { createSync } from 'nango';
import { issueFields } from '../fields/issue.js';
import type { LinearIssueResponse } from '../types.js';
import { toStandardTask } from '../mappers/to-standard-task.js';
import { StandardTask } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches issues from Linear and maps them to the standard task model',
    version: '1.0.0',
    frequency: 'every 5min',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/tasks/unified',
            group: 'Unified Task API'
        }
    ],

    models: {
        StandardTask: StandardTask
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const { lastSyncDate } = nango;
        const pageSize = 50;
        let after = '';

        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            const filterParam = lastSyncDate
                ? `, filter: { updatedAt: { gte: "${lastSyncDate.toISOString()}" } }`
                : '';

            const afterParam = after ? `, after: "${after}"` : '';

            const query = `
            query {
                issues (first: ${pageSize}${afterParam}${filterParam}) {
                    nodes {
                        ${issueFields}
                        priority
                        labels {
                            nodes {
                                name
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
                data: { query },
                retries: 10
            });

            const nodes: (LinearIssueResponse & { priority?: number; labels?: { nodes: { name: string }[] } })[] =
                response.data.data.issues.nodes;

            await nango.batchSave(nodes.map(toStandardTask), 'StandardTask');

            if (!response.data.data.issues.pageInfo.hasNextPage || !response.data.data.issues.pageInfo.endCursor) {
                break;
            } else {
                after = response.data.data.issues.pageInfo.endCursor;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
