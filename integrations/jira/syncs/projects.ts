import type { NangoSync, ProxyConfiguration } from '../../models.js';
import type { JiraProjectResponse } from '../types.js';
import { toProjects } from '../mappers/toProjects.js';
import { getCloudData } from '../helpers/get-cloud-data.js';

/**
 * Fetches and processes Jira projects data.
 * The function uses pagination to fetch data in batches.
 *
 * @param {NangoSync} nango - The NangoSync instance for handling synchronization tasks.
 */
export default async function fetchData(nango: NangoSync) {
    const properties = 'id,name,projectTypeKey,key';
    const cloud = await getCloudData(nango);
    const config: ProxyConfiguration = {
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-search-get
        endpoint: `/ex/jira/${cloud.cloudId}/rest/api/3/project/search`,
        params: {
            properties: properties
        },
        paginate: {
            type: 'offset',
            offset_name_in_request: 'startAt',
            response_path: 'values',
            limit_name_in_request: 'maxResults',
            limit: 50
        },
        headers: {
            'X-Atlassian-Token': 'no-check'
        },
        retries: 10
    };

    for await (const projects of nango.paginate<JiraProjectResponse>(config)) {
        const projectsToSave = toProjects(projects, cloud.baseUrl);
        await nango.batchSave(projectsToSave, 'Project');
    }
}
