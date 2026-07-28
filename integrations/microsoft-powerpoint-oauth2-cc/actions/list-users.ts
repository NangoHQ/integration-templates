import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    search: z.string().optional().describe('Search string to filter users by display name or email.'),
    top: z.number().optional().describe('Number of users to return per page. Maximum 999.'),
    cursor: z.string().optional().describe('Pagination cursor (odata.nextLink) from the previous response. Omit for the first page.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    displayName: z.string().nullish(),
    givenName: z.string().nullish(),
    surname: z.string().nullish(),
    mail: z.string().nullish(),
    userPrincipalName: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderUserSchema),
    '@odata.nextLink': z.string().optional().nullable()
});

const UserSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    givenName: z.string().optional(),
    surname: z.string().optional(),
    mail: z.string().optional(),
    userPrincipalName: z.string().optional()
});

const OutputSchema = z.object({
    users: z.array(UserSchema),
    nextLink: z.string().optional()
});

const action = createAction({
    description: 'List/search tenant users, to resolve a user id for personal OneDrive access.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['User.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        let endpoint: string;
        let headers: Record<string, string> | undefined;

        if (input.cursor) {
            const cursorUrl = new URL(input.cursor);
            endpoint = cursorUrl.pathname;
            cursorUrl.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } else {
            endpoint = '/v1.0/users';
            if (input.top !== undefined) {
                params['$top'] = input.top;
            }
            if (input.search !== undefined) {
                params['$search'] = '"displayName:' + input.search + '" OR "mail:' + input.search + '"';
                params['$count'] = 'true';
                headers = { ConsistencyLevel: 'eventual' };
            }
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/user-list
            endpoint,
            params,
            ...(headers !== undefined && { headers }),
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            users: providerResponse.value.map((user) => ({
                id: user.id,
                ...(user.displayName != null && { displayName: user.displayName }),
                ...(user.givenName != null && { givenName: user.givenName }),
                ...(user.surname != null && { surname: user.surname }),
                ...(user.mail != null && { mail: user.mail }),
                ...(user.userPrincipalName != null && { userPrincipalName: user.userPrincipalName })
            })),
            ...(providerResponse['@odata.nextLink'] != null && { nextLink: providerResponse['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
