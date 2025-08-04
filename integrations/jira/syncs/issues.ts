import type { NangoSync, JiraIssueMetadata, ProxyConfiguration } from '../../models';
import type { JiraIssueResponse } from '../types';
import { toIssues } from '../mappers/toIssues.js';
import { getCloudData } from '../helpers/get-cloud-data.js';

/**
 * Fetches and processes Jira issues data.
 * The function constructs a JQL query based on the last sync date and specified projects,
 * and uses pagination to fetch data in batches.
 *
 * @param {NangoSync} nango - The NangoSync instance for handling synchronization tasks.
 */
export default async function fetchData(nango: NangoSync) {
    const metadata = await nango.getMetadata<JiraIssueMetadata>();
    let jql = '';
    if (nango.lastSyncDate) {
        if (metadata?.timeZone) {
            try {
                new Date().toLocaleString('en-US', { timeZone: metadata.timeZone });
                const utcDate = new Date(nango.lastSyncDate);
                const targetDate = new Date(utcDate.toLocaleString('en-US', { timeZone: metadata.timeZone }));
                const year = targetDate.getFullYear();
                const month = String(targetDate.getMonth() + 1).padStart(2, '0');
                const day = String(targetDate.getDate()).padStart(2, '0');
                const hours = String(targetDate.getHours()).padStart(2, '0');
                const minutes = String(targetDate.getMinutes()).padStart(2, '0');

                const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`;
                jql = `updated >= "${formattedDate}"`;
            } catch (error) {
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
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-get
        endpoint: `/ex/jira/${cloud.cloudId}/rest/api/3/search`,
        params: {
            jql: finalJql,
            fields: fields
        },
        paginate: {
            type: 'offset',
            offset_name_in_request: 'startAt',
            response_path: 'issues',
            limit_name_in_request: 'maxResults',
            limit: 50
        },
        headers: {
            'X-Atlassian-Token': 'no-check'
        },
        retries: 10
    };

    //https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-get
    for await (const issues of nango.paginate<JiraIssueResponse>(config)) {
        const issuesToSave = toIssues(issues, cloud.baseUrl);
        await nango.batchSave(issuesToSave, 'Issue');
    }
}
