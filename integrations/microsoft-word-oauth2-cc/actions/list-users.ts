import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    filter: z.string().optional().describe('OData $filter expression. Example: "startswith(displayName, \'A\')"'),
    search: z.string().optional().describe('OData $search expression. Example: "api@nango.dev"'),
    top: z.number().int().min(1).max(999).optional().describe('Maximum number of users to return per page. Example: 10'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (@odata.nextLink). Omit for the first page.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    mail: z.string().nullable().optional(),
    userPrincipalName: z.string().nullable().optional()
});

const ProviderListSchema = z.object({
    value: z.array(ProviderUserSchema),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            displayName: z.string().optional(),
            mail: z.string().optional(),
            userPrincipalName: z.string().optional()
        })
    ),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List/search tenant users, to resolve a user id for personal OneDrive access.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['User.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint = '/v1.0/users';
        const params: Record<string, string | number> = {};

        if (input.cursor) {
            const cursorUrl = new URL(input.cursor);
            endpoint = cursorUrl.pathname;
            cursorUrl.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } else {
            if (input.filter !== undefined) {
                params['$filter'] = input.filter;
            }
            if (input.search !== undefined) {
                params['$search'] = input.search;
            }
            if (input.top !== undefined) {
                params['$top'] = input.top;
            }
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/user-list
            endpoint,
            params,
            retries: 3
        });

        const listData = ProviderListSchema.parse(response.data);

        return {
            items: listData.value.map((user) => ({
                id: user.id,
                ...(user.displayName != null && { displayName: user.displayName }),
                ...(user.mail != null && { mail: user.mail }),
                ...(user.userPrincipalName != null && { userPrincipalName: user.userPrincipalName })
            })),
            ...(listData['@odata.nextLink'] != null && { nextCursor: listData['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
