import type { NangoAction, ProxyConfiguration, TeamsList } from '../../models';
import { findTeamFields } from '../helpers/find-team-fields';
import { getCloudData } from '../helpers/get-cloud-data';

/**
 * This function fetches a list of teams in an issue from Jira.
 * It validates the input issue data and sends a request to fetch the issue in the Jira API.
 * For detailed endpoint documentation, refer to:
 *
 * @param {NangoAction} nango - The Nango action instance to handle API requests.
 * @param {issueKey} input - The issue data input that will be sent to Jira.
 * @throws {nango.ActionError} - Throws an error if the input is missing or lacks required fields.
 * @returns {Promise<TeamsList[]>} - Returns the created issue object from Jira.
 */
export default async function runAction(nango: NangoAction, issueKey: string): Promise<TeamsList[]> {
    if (!issueKey) {
        throw new nango.ActionError({
            message: `Required fields (issueKey) are missing. Received: ${JSON.stringify(issueKey)}`
        });
    }
    const { cloudId } = await getCloudData(nango);

    const config: ProxyConfiguration = {
        //https://developer.atlassian.com/cloud/jira/platform/rest/api/3/issues/{issueIdOrKey}?expand=editmeta
        endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}`,
        headers: {
            'X-Atlassian-Token': 'no-check'
        },
        params: {
            expand: 'editmeta'
        },
        retries: 10
    };

    try {
        const { data } = await nango.get(config);

        return findTeamFields(data);
    } catch (error) {
        console.error('Error fetching teams from issue:', error);
        throw error;
    }
}
