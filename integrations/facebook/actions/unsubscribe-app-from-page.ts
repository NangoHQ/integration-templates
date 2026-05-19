import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageId: z.string().describe('Facebook Page ID. Example: "123456789012345"')
});

const PageAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    access_token: z.string()
});

const PageAccountsResponseSchema = z.object({
    data: z.array(PageAccountSchema)
});

const ProviderResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove the app subscription from a Facebook Page',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/unsubscribe-app-from-page',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_manage_metadata'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/me/accounts
        const accountsResponse = await nango.get({
            endpoint: '/me/accounts',
            retries: 3
        });

        const parsedAccounts = PageAccountsResponseSchema.parse(accountsResponse.data);

        const pageAccount = parsedAccounts.data.find((page) => page.id === input.pageId);

        if (!pageAccount) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Page not found in user accounts',
                pageId: input.pageId
            });
        }

        // https://developers.facebook.com/docs/graph-api/reference/page/subscribed_apps
        const response = await nango.delete({
            endpoint: `/${encodeURIComponent(input.pageId)}/subscribed_apps`,
            params: {
                access_token: pageAccount.access_token
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
