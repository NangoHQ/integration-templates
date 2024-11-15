import type { NangoAction, CreateIssueInput, CreateIssueOutput, ProxyConfiguration } from '../../models';
import { toJiraIssue } from '../mappers/toJiraIssue.js';
import { getCloudData } from '../helpers/get-cloud-data.js';

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
export default async function runAction(nango: NangoAction, input: CreateIssueInput): Promise<CreateIssueOutput> {
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
        retries: 10
    };

    const response = await nango.post(config);

    return response.data;
}
