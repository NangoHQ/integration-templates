import { createSync } from 'nango';
import type { JiraIssueResponse } from '../types.js';
import { toIssues } from '../mappers/toIssues.js';
import { getCloudData } from '../helpers/get-cloud-data.js';

import type { ProxyConfiguration } from 'nango';
import { Issue, JiraIssueMetadata } from '../models.js';

/**
 * Fetches and processes Jira issues data.
 * The function constructs a JQL query based on the last sync date and specified projects,
 * and uses pagination to fetch data in batches.
 *
 * @param {NangoSync} nango - The NangoSync instance for handling synchronization tasks.
 */
const sync = createSync({
    description: 'Fetches a list of issues from Jira',
    version: '2.0.1',
    frequency: 'every 5mins',
    autoStart: false,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/issues',
            group: 'Issues'
        }
    ],

    scopes: ['read:jira-work'],

    models: {
        Issue: Issue
    },

    metadata: JiraIssueMetadata,

    exec: async (nango) => {
        const metadata = await nango.getMetadata<JiraIssueMetadata>();
        let jql = '';
        if (nango.lastSyncDate) {
            if (metadata?.timeZone) {
                // @allowTryCatch
                try {
                    // Validate timezone
                    Intl.DateTimeFormat(undefined, { timeZone: metadata.timeZone });

                    // Format date in the specified timezone
                    const formatter = new Intl.DateTimeFormat('sv-SE', {
                        timeZone: metadata.timeZone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    const formattedDate = formatter.format(nango.lastSyncDate).replace('T', ' ');
                    jql = `updated >= "${formattedDate}"`;
                } catch {
                    await nango.log(`Invalid timezone: ${metadata.timeZone}, falling back to UTC`);
                    jql = `updated >= "${nango.lastSyncDate?.toISOString().slice(0, -8).replace('T', ' ')}"`;
                }
            } else {
                jql = `updated >= "${nango.lastSyncDate?.toISOString().slice(0, -8).replace('T', ' ')}"`;
            }
        }

        const fields = 'id,key,summary,description,issuetype,status,assignee,reporter,project,created,updated,comment';
        const cloud = await getCloudData(nango);

        let projectJql = '';
        if (metadata && metadata.projectIdsToSync && metadata.projectIdsToSync.length > 0) {
            const projectIdsString = metadata.projectIdsToSync.map((project) => `"${project.id.trim()}"`).join(',');
            projectJql = `project in (${projectIdsString})`;
        } else {
            if (!metadata) {
                throw new Error('Required metadata not found for issues sync');
            } else if (!metadata.projectIdsToSync || metadata.projectIdsToSync.length === 0) {
                throw new Error('No projects configured for issues sync');
            }
        }

        const finalJql = jql ? `${jql}${projectJql ? ` AND ${projectJql}` : ''}` : projectJql;
        const config: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-jql-get
            endpoint: `/ex/jira/${cloud.cloudId}/rest/api/3/search/jql`,
            params: {
                jql: finalJql,
                fields: fields
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'nextPageToken',
                cursor_name_in_request: 'nextPageToken',
                response_path: 'issues',
                limit_name_in_request: 'maxResults',
                limit: 50
            },
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 10
        };

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-jql-get
        for await (const issues of nango.paginate<JiraIssueResponse>(config)) {
            const issuesToSave = toIssues(issues, cloud.baseUrl);
            await nango.batchSave(issuesToSave, 'Issue');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
