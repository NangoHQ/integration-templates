import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { toStandardTask } from '../mappers/to-standard-task.js';
import { StandardTask } from '../models.js';
import { z } from 'zod';

const LIMIT = 100;

const sync = createSync({
    description: "Fetches GitHub issues from all a user's repositories and maps them to the standard task model",
    version: '1.0.0',
    frequency: 'every half hour',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/tasks/unified',
            group: 'Unified Task API'
        }
    ],

    scopes: ['public_repo'],

    models: {
        StandardTask: StandardTask
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const repos: any[] = await getAllRepositories(nango);

        for (const repo of repos) {
            const params: Record<string, string | number> = { limit: LIMIT, state: 'all' };

            if (nango.lastSyncDate) {
                params['since'] = nango.lastSyncDate.toISOString();
            }

            const proxyConfig: ProxyConfiguration = {
                endpoint: `/repos/${repo.owner.login}/${repo.name}/issues`,
                params,
                paginate: { limit: LIMIT }
            };

            for await (const issueBatch of nango.paginate(proxyConfig)) {
                const issues: any[] = issueBatch.filter((issue: any) => !('pull_request' in issue));
                const mappedTasks = issues.map((issue: any) => toStandardTask(issue, repo.owner.login, repo.name));

                if (mappedTasks.length > 0) {
                    await nango.batchSave(mappedTasks, 'StandardTask');
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function getAllRepositories(nango: NangoSyncLocal) {
    const records: any[] = [];
    const proxyConfig: ProxyConfiguration = {
        // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#list-repositories-for-the-authenticated-user
        endpoint: '/user/repos',
        paginate: { limit: LIMIT }
    };

    for await (const recordBatch of nango.paginate(proxyConfig)) {
        records.push(...recordBatch);
    }

    return records;
}
