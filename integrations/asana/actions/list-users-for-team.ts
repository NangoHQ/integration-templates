import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    team_gid: z.string().describe('Globally unique identifier for the team. Example: "12345"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to the Asana offset token.'),
    opt_fields: z.string().optional().describe('Comma-separated list of optional fields to include in the response. Example: "name,email,photo"')
});

const ProviderUserSchema = z
    .object({
        gid: z.string(),
        resource_type: z.string().nullish(),
        name: z.string().nullish(),
        email: z.string().nullish(),
        photo: z.unknown().nullish()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    next_page: z
        .object({
            offset: z.string().optional(),
            path: z.string().optional(),
            uri: z.string().optional()
        })
        .nullish()
});

const ListOutputSchema = z.object({
    items: z.array(ProviderUserSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List users in a team.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-users-for-team',
        group: 'Users'
    },
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['users:read'],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://developers.asana.com/reference/getusersforteam
            endpoint: `/api/1.0/teams/${input.team_gid}/users`,
            params: {
                ...(input.cursor && { offset: input.cursor }),
                ...(input.opt_fields && { opt_fields: input.opt_fields })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item) => ProviderUserSchema.parse(item));

        return {
            items,
            ...(providerResponse.next_page?.offset != null && { next_cursor: providerResponse.next_page.offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
