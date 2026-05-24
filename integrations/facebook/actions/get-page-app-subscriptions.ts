import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageId: z.string().describe('Facebook Page ID. Example: "1148671018324630"'),
    fields: z.string().optional().describe('Comma-separated list of fields to return for each subscribed app. Example: "id,name,link,subscribed_fields"')
});

const SubscribedAppSchema = z.object({
    id: z.string().describe('App ID'),
    name: z.string().optional().describe('App name'),
    link: z.string().optional().describe('App link URL'),
    subscribed_fields: z.array(z.string()).optional().describe('List of subscribed webhook fields')
});

const OutputSchema = z.object({
    data: z.array(SubscribedAppSchema).describe('List of apps subscribed to the page'),
    paging: z
        .object({
            cursors: z
                .object({
                    before: z.string().optional(),
                    after: z.string().optional()
                })
                .optional(),
            next: z.string().optional().describe('URL for the next page of results')
        })
        .optional()
        .describe('Pagination information')
});

const PageTokenResponseSchema = z.object({
    data: z.array(
        z.object({
            access_token: z.string(),
            id: z.string()
        })
    )
});

const action = createAction({
    description: 'Retrieve app subscriptions configured on a Facebook Page',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-page-app-subscriptions',
        group: 'Page Subscriptions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pages_manage_metadata'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/graph-api/reference/page/subscribed_apps/
        let pageEntry: z.infer<typeof PageTokenResponseSchema>['data'][number] | undefined;
        for await (const batch of nango.paginate<z.infer<typeof PageTokenResponseSchema>['data'][number]>({
            endpoint: '/me/accounts',
            params: { fields: 'id,access_token' },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'paging.cursors.after',
                cursor_name_in_request: 'after',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        })) {
            const found = batch.find((page) => page.id === input.pageId);
            if (found) {
                pageEntry = found;
                break;
            }
        }

        if (!pageEntry) {
            throw new nango.ActionError({
                type: 'page_not_found',
                message: 'Page not found in user accounts or user lacks access to this page',
                pageId: input.pageId
            });
        }

        // https://developers.facebook.com/docs/graph-api/reference/page/subscribed_apps/#Reading
        const params: Record<string, string | string[]> = {
            access_token: pageEntry.access_token
        };

        if (input.fields) {
            params['fields'] = input.fields;
        }

        const response = await nango.get({
            endpoint: `/${encodeURIComponent(input.pageId)}/subscribed_apps`,
            params,
            retries: 3
        });

        const result = OutputSchema.parse(response.data);
        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
