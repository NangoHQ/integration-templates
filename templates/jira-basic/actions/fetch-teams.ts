import { createAction } from "nango";
import type { JiraTeamResponse } from '../types.js';

import type { ProxyConfiguration } from "nango";
import type { Team} from "../models.js";
import { Teams, IdEntity } from "../models.js";

/**
 * This function fetches a list of teams in an organisation from Jira.
 * It validates the input orgId data and sends a request to fetch the issue in the Jira API.
 * For detailed endpoint documentation, refer to:
 * https://developer.atlassian.com/platform/teams/rest/v1/api-group-teams-public-api/#api-group-teams-public-api
 *
 * @param {NangoAction} nango - The Nango action instance to handle API requests.
 * @param {issueKey} orgId - The orgId input that will be sent to Jira.
 * @throws {nango.ActionError} - Throws an error if the input is missing or lacks required fields.
 * @returns {Promise<Teams>} - Returns the list of teams from Jira.
 */
const action = createAction({
    description: "Fetch teams in an organisation in Jira",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/teams-list",
        group: "Teams"
    },

    input: IdEntity,
    output: Teams,

    exec: async (nango, orgId): Promise<Teams> => {
        if (!orgId || !orgId.id) {
            throw new nango.ActionError({
                message: `Required fields (organisationId) are missing. Received: ${JSON.stringify(orgId)}`
            });
        }
        const PageSize = 100;
        const config: ProxyConfiguration = {
            baseUrlOverride: 'https://api.atlassian.com',
            // https://api.attlassian.com/public/teams/v1/org/{orgId}/teams
            endpoint: `/public/teams/v1/org/${orgId.id}/teams`,
            paginate: {
                type: 'cursor',
                limit: PageSize,
                limit_name_in_request: 'size',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'entities'
            },
            responseType: 'json',
            retries: 3
        };

        const teams: Team[] = [];

        for await (const teamResponse of nango.paginate<JiraTeamResponse>(config)) {
            const teamData: Team[] = teamResponse.map((team: JiraTeamResponse) => ({
                id: team.teamId,
                name: team.displayName
            }));

            teams.push(...teamData);
        }
        return { teams };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
