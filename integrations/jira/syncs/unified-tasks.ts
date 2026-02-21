import { createSync } from 'nango';
import type { JiraIssueResponse } from '../types.js';
import { toStandardTask } from '../mappers/to-standard-task.js';
import { getCloudData } from '../helpers/get-cloud-data.js';
import type { ProxyConfiguration } from 'nango';
import { StandardTask, JiraIssueMetadata } from '../models.js';

const sync = createSync({
    description: 'Fetches issues from Jira and maps them to the standard task model',
    version: '1.0.0',
    frequency: 'every 5mins',
    autoStart: false,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/tasks/unified',
            group: 'Unified Task API'
        }
    ],

    scopes: ['read:jira-work'],

    models: {
        StandardTask: StandardTask
    },

    metadata: JiraIssueMetadata,

    exec: async (nango) => {
        const metadata = await nango.getMetadata<JiraIssueMetadata>();
        let jql = '';

        if (nango.lastSyncDate) {
            jql = `updated >= "${nango.lastSyncDate.toISOString().slice(0, -8).replace('T', ' ')}"`;
        }

        const fields = 'id,key,summary,issuetype,status,assignee,project,created,updated,priority,labels,duedate';
        const cloud = await getCloudData(nango);

        let projectJql = '';
        if (metadata && metadata.projectIdsToSync && metadata.projectIdsToSync.length > 0) {
            const projectIdsString = metadata.projectIdsToSync.map((project) => `"${project.id.trim()}"`).join(',');
            projectJql = `project in (${projectIdsString})`;
        } else {
            if (!metadata) {
                throw new Error('Required metadata not found for unified tasks sync');
            } else if (!metadata.projectIdsToSync || metadata.projectIdsToSync.length === 0) {
                throw new Error('No projects configured for unified tasks sync');
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

        for await (const issues of nango.paginate<JiraIssueResponse>(config)) {
            const tasksToSave = issues.map((issue) => toStandardTask(issue, cloud.baseUrl));
            await nango.batchSave(tasksToSave, 'StandardTask');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
