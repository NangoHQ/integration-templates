import { createSync } from 'nango';
import { Issue } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches Github issues but up to a maximum of 15',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: false,
    syncType: 'full',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/github/issues-lite'
        }
    ],

    scopes: ['public_repo'],

    models: {
        Issue: Issue
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const MAX_ISSUES = 15;
        const reposResponse = await nango.get({
            endpoint: '/user/repos',
            retries: 10
        });
        const repos = reposResponse.data;

        for (const repo of repos) {
            const issuesResponse = await nango.get({
                endpoint: `/repos/${repo.owner.login}/${repo.name}/issues`,
                params: {
                    per_page: MAX_ISSUES.toString()
                },
                retries: 10
            });

            let issues = issuesResponse.data;

            issues = issues.filter((issue: any) => !('pull_request' in issue));

            const mappedIssues: Issue[] = issues.map((issue: any) => ({
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
                await nango.batchSave(mappedIssues, 'Issue');
                await nango.log(`Sent ${mappedIssues.length} issues from ${repo.owner.login}/${repo.name}`);
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
