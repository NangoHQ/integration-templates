import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_id: z.string().describe('Facebook Page ID to subscribe the app to. Example: "1148671018324630"'),
    subscribed_fields: z.array(z.string()).describe('Array of webhook event types to subscribe to. Example: ["feed", "messages", "mention", "name", "picture"]')
});

const ProviderResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean()
});

// Schema for page access token from /me/accounts
const PageAccountSchema = z.object({
    id: z.string(),
    access_token: z.string()
});

const PageAccountsResponseSchema = z.object({
    data: z.array(PageAccountSchema)
});

const action = createAction({
    description: 'Subscribe the app to receive updates for a Facebook Page',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/subscribe-app-to-page',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_manage_metadata'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // First, get the page access token by looking up the user's pages
        // https://developers.facebook.com/docs/graph-api/reference/user/accounts/
        const accountsResponse = await nango.get({
            endpoint: '/me/accounts',
            retries: 3
        });

        const accountsData = PageAccountsResponseSchema.parse(accountsResponse.data);
        const pageAccount = accountsData.data.find((page) => page.id === input.page_id);

        if (!pageAccount) {
            throw new nango.ActionError({
                type: 'page_not_found',
                message: `Page with ID "${input.page_id}" not found in user's accounts. Ensure the user has access to this page.`,
                page_id: input.page_id
            });
        }

        // Subscribe the app to the page using the page access token
        // https://developers.facebook.com/docs/graph-api/reference/page/subscribed_apps/
        const response = await nango.post({
            endpoint: `/${encodeURIComponent(input.page_id)}/subscribed_apps`,
            params: {
                access_token: pageAccount.access_token,
                subscribed_fields: input.subscribed_fields.join(',')
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
