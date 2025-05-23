import type { NangoSync, JiraIssueMetadata, ProxyConfiguration } from '../../models';
import type { JiraIssueType } from '../types';
import { toIssueTypes } from '../mappers/toIssueTypes.js';
import { getCloudData } from '../helpers/get-cloud-data.js';

/**
 * Fetches and processes Jira issue types data for a specific project.
 *
 * @param {NangoSync} nango - The NangoSync instance for handling synchronization tasks.
 */
export default async function fetchData(nango: NangoSync) {
    const cloud = await getCloudData(nango);

    const metadata = await nango.getMetadata<JiraIssueMetadata>();

    if (metadata && metadata.projectIdsToSync && metadata.projectIdsToSync.length > 0) {
        for (const project of metadata.projectIdsToSync) {
            const projectId = project.id;
            const config: ProxyConfiguration = {
                //https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-types/#api-rest-api-3-issuetype-project-get
                endpoint: `/ex/jira/${cloud.cloudId}/rest/api/3/issuetype/project`,
                params: {
                    projectId: Number(projectId)
                },
                headers: {
                    'X-Atlassian-Token': 'no-check'
                },
                retries: 10
            };

            const issueTypeResponse = await nango.get<JiraIssueType[]>(config);
            const issueTypes = toIssueTypes(issueTypeResponse.data, projectId);
            if (issueTypes.length > 0) {
                await nango.batchSave(issueTypes, 'IssueType');
            }
        }
    } else {
        if (!metadata) {
            throw new Error('Required metadata not found for issue-types sync');
        } else if (!metadata.projectIdsToSync || metadata.projectIdsToSync.length === 0) {
            throw new Error('No projects configured for issue-types sync');
        }
    }
}
