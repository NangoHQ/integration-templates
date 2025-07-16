import { createSync } from "nango";
import { LinearUser } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of users from Linear",
    version: "1.0.1",
    frequency: "every 5min",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/users",
        group: "Users"
    }],

    models: {
        LinearUser: LinearUser
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
                users (first: ${pageSize}${afterParam}${filterParam}) {
                    nodes {
                        id
                        name
                        admin
                        name
                        email
                        avatarUrl
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

            await nango.batchSave(mapUsers(response.data.data.users.nodes), 'LinearUser');

            if (!response.data?.data?.users?.pageInfo.hasNextPage || !response.data?.data?.users?.pageInfo.endCursor) {
                break;
            } else {
                after = response.data.data.users.pageInfo.endCursor;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

function mapUsers(records: any[]): LinearUser[] {
    return records.map((record: any) => {
        return {
            id: record.id,
            firstName: record.name.split(' ')[0],
            lastName: record.name.split(' ')[1],
            email: record.email,
            admin: record.admin,
            avatarUrl: record.avatarUrl
        };
    });
}
