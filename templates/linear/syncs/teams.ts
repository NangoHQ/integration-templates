import { createSync } from "nango";
import { LinearTeam } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of teams from Linear",
    version: "2.0.0",
    frequency: "every 5min",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/teams",
        group: "Teams"
    }],

    models: {
        LinearTeam: LinearTeam
    },

    metadata: z.object({}),

    exec: async nango => {
        const { lastSyncDate } = nango;
        const pageSize = 50;
        let after = '';

        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            const filterParam = lastSyncDate
                ? `
            , filter: {
                updatedAt: { gte: "${lastSyncDate.toISOString()}" }
            }`
                : '';

            const afterParam = after ? `, after: "${after}"` : '';

            const query = `
            query {
                teams (first: ${pageSize}${afterParam}${filterParam}) {
                    nodes {
                        id
                        name
                        description
                        createdAt
                        updatedAt
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }`;

            const response = await nango.post({
                baseUrlOverride: 'https://api.linear.app',
                endpoint: '/graphql',
                data: {
                    query: query
                },
                retries: 10
            });

            await nango.batchSave(mapTeams(response.data.data.teams.nodes), 'LinearTeam');

            if (!response.data.data.teams.pageInfo.hasNextPage || !response.data.data.teams.pageInfo.endCursor) {
                break;
            } else {
                after = response.data.data.teams.pageInfo.endCursor;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function mapTeams(records: any[]): LinearTeam[] {
    return records.map((record: any) => {
        return {
            id: record.id,
            name: record.name,
            description: record.description,
            createdAt: new Date(record.createdAt).toISOString(),
            updatedAt: new Date(record.updatedAt).toISOString()
        };
    });
}
