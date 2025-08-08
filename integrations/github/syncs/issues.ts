import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { GithubIssue } from '../models.js';
import { z } from 'zod';

const LIMIT = 100;

const sync = createSync({
    description: "Fetches Github issues from all a user's repositories",
    version: '2.0.0',
    frequency: 'every half hour',
    autoStart: true,
    syncType: 'full',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/github/issues'
        }
    ],

    scopes: ['public_repo'],

    models: {
        GithubIssue: GithubIssue
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const repos: any[] = await getAllRepositories(nango);

        for (const repo of repos) {
            const proxyConfig = {
                endpoint: `/repos/${repo.owner.login}/${repo.name}/issues`,
                paginate: {
                    limit: LIMIT
                }
            };
            for await (const issueBatch of nango.paginate(proxyConfig)) {
                const issues: any[] = issueBatch.filter((issue: any) => !('pull_request' in issue));

                const mappedIssues: GithubIssue[] = issues.map((issue: any) => ({
                    id: issue.id.toString(),
                    owner: repo.owner.login,
                    repo: repo.name,
                    issue_number: issue.number,
                    title: issue.title,
                    state: issue.state,
                    author: issue.user.login,
                    author_id: issue.user.id,
                    body: issue.body,
                    date_created: issue.created_at,
                    date_last_modified: issue.updated_at
                }));

                if (mappedIssues.length > 0) {
                    await nango.batchSave(mappedIssues, 'GithubIssue');
                    await nango.log(`Sent ${mappedIssues.length} issues from ${repo.owner.login}/${repo.name}`);
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
        paginate: {
            limit: LIMIT
        }
    };

    for await (const recordBatch of nango.paginate(proxyConfig)) {
        records.push(...recordBatch);
    }

    return records;
}
