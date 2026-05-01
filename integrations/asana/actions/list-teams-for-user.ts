import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_gid: z.string().describe('User GID, email, or "me". Example: "me"'),
    organization: z.string().describe('Workspace or organization GID to filter teams. Example: "12345"'),
    cursor: z.string().optional().describe('Pagination offset cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results per page (1-100). Defaults to 100.')
});

const ProviderOrganizationSchema = z.object({
    gid: z.string(),
    name: z.string().nullable().optional()
});

const ProviderTeamSchema = z.object({
    gid: z.string(),
    name: z.string().nullable().optional(),
    resource_type: z.string().optional(),
    description: z.string().nullable().optional(),
    permalink_url: z.string().nullable().optional(),
    organization: ProviderOrganizationSchema.optional()
});

const ProviderNextPageSchema = z.object({
    offset: z.string().optional(),
    path: z.string().optional(),
    uri: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderTeamSchema),
    next_page: ProviderNextPageSchema.nullable().optional()
});

const TeamSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional(),
    description: z.string().optional(),
    permalink_url: z.string().optional(),
    organization: z
        .object({
            gid: z.string(),
            name: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(TeamSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List teams for a user.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-teams-for-user',
        group: 'Teams'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            organization: input.organization,
            limit: input.limit ?? 100,
            opt_fields: 'name,description,organization,permalink_url'
        };

        if (input.cursor !== undefined && input.cursor !== '') {
            params['offset'] = input.cursor;
        }

        // https://developers.asana.com/reference/getteamsforuser
        const response = await nango.get({
            endpoint: `api/1.0/users/${encodeURIComponent(input.user_gid)}/teams`,
            params,
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.data.map((team) => ({
                gid: team.gid,
                resource_type: team.resource_type,
                ...(team.name != null && { name: team.name }),
                ...(team.description != null && { description: team.description }),
                ...(team.permalink_url != null && { permalink_url: team.permalink_url }),
                ...(team.organization != null && {
                    organization: {
                        gid: team.organization.gid,
                        ...(team.organization.name != null && { name: team.organization.name })
                    }
                })
            })),
            ...(providerResponse.next_page?.offset != null && {
                next_cursor: providerResponse.next_page.offset
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
