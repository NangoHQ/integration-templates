import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderFollowerSchema = z.object({
    type: z.string().optional(),
    username: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderFollowerSchema),
    bookmark: z.string().optional().describe('Cursor to fetch the next page of items. Omitted when there are no more pages.')
});

const action = createAction({
    description: 'List followers of the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/followers/list
            endpoint: '/v5/user_account/followers',
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                items: z.array(ProviderFollowerSchema),
                bookmark: z.string().nullable().optional()
            })
            .parse(response.data);

        return {
            items: providerResponse.items,
            ...(providerResponse.bookmark != null && { bookmark: providerResponse.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
