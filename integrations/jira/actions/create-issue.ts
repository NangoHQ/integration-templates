import { createAction } from 'nango';
import { toJiraIssue } from '../mappers/toJiraIssue.js';
import { getCloudData } from '../helpers/get-cloud-data.js';

import type { ProxyConfiguration } from 'nango';
import { CreateIssueOutput, CreateIssueInput, JiraIssueMetadata } from '../models.js';

/**
 * This function handles the creation of an issue in Jira via the Nango action.
 * It validates the input issue data, maps it to the appropriate Jira issue structure,
 * and sends a request to create the issue in the Jira API.
 * For detailed endpoint documentation, refer to:
 *
 * @param {NangoAction} nango - The Nango action instance to handle API requests.
 * @param {CreateIssueInput} input - The issue data input that will be sent to Jira.
 * @throws {nango.ActionError} - Throws an error if the input is missing or lacks required fields.
 * @returns {Promise<CreateIssueOutput>} - Returns the created issue object from Jira.
 */
const action = createAction({
    description: 'An action that creates an Issue on Jira',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/issues',
        group: 'Issues'
    },

    input: CreateIssueInput,
    output: CreateIssueOutput,
    scopes: ['write:jira-work'],
    metadata: JiraIssueMetadata,

    exec: async (nango, input): Promise<CreateIssueOutput> => {
        // Validate input fields: summary, issueType, and project are required
        if (!input || !input.summary || !input.issueType || !input.project) {
            throw new nango.ActionError({
                message: `Required fields (summary, issueType, project) are missing. Received: ${JSON.stringify(input)}`
            });
        }

        const cloud = await getCloudData(nango);

        const jiraIssue = toJiraIssue(input);

        const config: ProxyConfiguration = {
            //https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post
            endpoint: `/ex/jira/${cloud.cloudId}/rest/api/3/issue`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            data: jiraIssue,
            retries: 3
        };

        const response = await nango.post(config);

        return response.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
