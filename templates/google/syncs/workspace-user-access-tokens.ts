import { createSync } from "nango";
import { GoogleWorkspaceUserToken } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Sync all workspace users access tokens",
    version: "2.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "full",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/google/workspace-user-access-tokens"
    }],

    scopes: [
        "https://www.googleapis.com/auth/admin.directory.user.readonly",
        "https://www.googleapis.com/auth/admin.directory.user.security"
    ],

    models: {
        GoogleWorkspaceUserToken: GoogleWorkspaceUserToken
    },

    metadata: z.object({}),

    exec: async nango => {
        // Get the users in the org
        const params = {
            customer: 'my_customer'
        };
        const users = await paginate(nango, '/admin/directory/v1/users', 'users', params);

        for (const user of users) {
            // Get the access tokens
            const tokens = await paginate(nango, `/admin/directory/v1/users/${user.id}/tokens`, 'items');
            const mappedTokens: GoogleWorkspaceUserToken[] = tokens.map((token) => ({
                id: token.clientId,
                user_id: user.id,
                app_name: token.displayText,
                anonymous_app: token.anonymous,
                scopes: token.scopes.join(',')
            }));

            await nango.batchSave(mappedTokens, 'GoogleWorkspaceUserToken');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

async function paginate(nango: NangoSyncLocal, endpoint: string, resultsKey: string, queryParams?: Record<string, string | string[]>) {
    const MAX_PAGE = 100;
    let results: any[] = [];
    let page = null;
    const callParams = queryParams || {};
    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
    while (true) {
        if (page) {
            callParams['pageToken'] = `${page}`;
        }

        const resp = await nango.get({
            baseUrlOverride: 'https://admin.googleapis.com',
            endpoint: endpoint,
            params: {
                maxResults: `${MAX_PAGE}`,
                ...callParams
            },
            retries: 10
        });

        results = results.concat(resp.data[resultsKey]);

        if (resp.data.nextPageToken) {
            page = resp.data.nextPageToken;
        } else {
            break;
        }
    }

    return results;
}
