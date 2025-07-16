import { createAction } from "nango";
import { fetchTeamsInputSchema } from '../schema.zod.js';
import type { LinearTeamsResponse } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { FetchTeamsInput, LinearTeamBase, TeamsPaginatedResponse } from "../models.js";

/**
 * Action to fetch teams from Linear with pagination support.
 *
 * @param {NangoAction} nango - The Nango action instance used to make the API request.
 * @param {FetchTeamsInput} input - The input parameters for fetching teams.
 * @returns {Promise<TeamsPaginatedResponse>} - A promise that resolves to the paginated teams response.
 *
 * The input parameters can include:
 * - `after` (optional): The cursor for pagination
 * - `pageSize` (optional): Number of teams to fetch per page (default: 50)
 */
const action = createAction({
    description: "Fetch the teams from Linear",
    version: "0.0.1",

    endpoint: {
        method: "GET",
        path: "/teams/list",
        group: "Teams"
    },

    input: FetchTeamsInput,
    output: TeamsPaginatedResponse,

    exec: async (nango, input: FetchTeamsInput = {}): Promise<TeamsPaginatedResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: fetchTeamsInputSchema, input });

        const pageSize = parsedInput.data.pageSize || 50;
        const after = parsedInput.data.after ? `, after: "${parsedInput.data.after}"` : '';

        const query = `
            query {
                teams (first: ${pageSize}${after}) {
                    nodes {
                        id
                        name
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }`;

        const config: ProxyConfiguration = {
            // https://studio.apollographql.com/public/Linear-API/variant/current/explorer
            endpoint: '/graphql',
            data: {
                query
            },
            retries: 3
        };

        const response = await nango.post<LinearTeamsResponse>(config);
        if (response.data.errors && response.data.errors.length > 0) {
            throw new nango.ActionError({
                message: `GraphQL error: ${response.data.errors[0]?.message ?? 'Unknown error'}`,
                errors: response.data.errors
            });
        }
        const { nodes, pageInfo } = response.data.data.teams;

        return {
            teams: nodes.map((team: LinearTeamBase) => ({
                id: team.id,
                name: team.name
            })),
            pageInfo: {
                hasNextPage: pageInfo.hasNextPage,
                endCursor: pageInfo.endCursor
            }
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
