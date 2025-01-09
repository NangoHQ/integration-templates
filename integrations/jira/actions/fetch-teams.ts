import type { NangoSync, ProxyConfiguration, Team as JiraTeam, Teams } from '../../models';
import type { JiraProjectResponse, JiraSearchResponse } from '../types';
import { toProjects } from '../mappers/toProjects.js';
import { getCloudData } from '../helpers/get-cloud-data.js';
import { extractTeamsFromIssues } from '../helpers/extract-teams-from-issues.js';

/**
 * Fetch all unique teams across Jira projects.
 * The function fetches projects, then queries each project for its teams,
 * and deduplicates the results.
 *
 * @param {NangoSync} nango - The NangoSync instance for handling synchronization tasks.
 * @returns {Promise<JiraTeam[]>} Array of unique teams
 */
export default async function runAction(nango: NangoSync): Promise<Teams> {
    const properties = 'id,name,projectTypeKey,key';
    const cloud = await getCloudData(nango);

    let uniqueTeams = new Map<string, JiraTeam>();
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
            limit: 100
        },
        headers: {
            'X-Atlassian-Token': 'no-check'
        },
        retries: 10
    };

    for await (const projects of nango.paginate<JiraProjectResponse>(config)) {
        const projectsToSave = toProjects(projects, cloud.baseUrl);

        for (const project of projectsToSave) {
            const response = await nango.get<JiraSearchResponse>({
                // https://developer.atlassian.com/cloud/jira/platform/rest/api-group-search/#api-rest-api-3-search-get
                endpoint: `/ex/jira/${cloud.cloudId}/rest/api/3/search`,
                params: {
                    jql: `project = "${project.key}"`,
                    expand: 'editmeta'
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'startAt',
                    response_path: 'issues',
                    limit_name_in_request: 'maxResults',
                    limit: 100
                },
                headers: {
                    'X-Atlassian-Token': 'no-check'
                },
                retries: 10
            });

            if (response.data.issues) {
                const teams = extractTeamsFromIssues(response.data.issues);
                uniqueTeams = new Map([...uniqueTeams, ...teams]);
            }
        }
    }

    return {
        teams: Array.from(uniqueTeams.values())
    };
}
