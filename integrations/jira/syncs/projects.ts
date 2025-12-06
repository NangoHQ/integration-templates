import { createSync } from 'nango';
import type { JiraProjectResponse } from '../types.js';
import { toProjects } from '../mappers/toProjects.js';
import { getCloudData } from '../helpers/get-cloud-data.js';

import type { ProxyConfiguration } from 'nango';
import { Project, JiraIssueMetadata } from '../models.js';

/**
 * Fetches and processes Jira projects data.
 * The function uses pagination to fetch data in batches.
 *
 * @param {NangoSync} nango - The NangoSync instance for handling synchronization tasks.
 */
const sync = createSync({
    description: 'Fetches a list of projects from Jira',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/projects'
        }
    ],

    scopes: ['read:jira-work'],

    models: {
        Project: Project
    },

    metadata: JiraIssueMetadata,

    exec: async (nango) => {
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
        await nango.deleteRecordsFromPreviousExecutions('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
