import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    limit: z.number().optional().describe('Maximum number of organizations to return per page.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    dateLastActivity: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    idEnterprise: z.string().nullable().optional(),
    offering: z.string().nullable().optional(),
    idBoards: z.array(z.string()).nullable().optional(),
    memberships: z.array(z.unknown()).nullable().optional(),
    premiumFeatures: z.array(z.string()).nullable().optional(),
    prefs: z.record(z.string(), z.unknown()).nullable().optional()
});

const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    dateLastActivity: z.string().optional(),
    url: z.string().optional(),
    idEnterprise: z.string().optional(),
    offering: z.string().optional(),
    idBoards: z.array(z.string()).optional(),
    memberships: z.array(z.unknown()).optional(),
    premiumFeatures: z.array(z.string()).optional(),
    prefs: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    items: z.array(OrganizationSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List organizations (workspaces) for the authenticated Trello member.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-organizations',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/trello/rest/api-group-members/#api-members-id-organizations-get
            endpoint: '/1/members/me/organizations',
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor !== undefined && { page: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const rawItems = z.array(z.unknown()).parse(response.data);
        const items = rawItems.map((item: unknown) => {
            const org = ProviderOrganizationSchema.parse(item);
            return {
                id: org.id,
                ...(org.name != null && { name: org.name }),
                ...(org.displayName != null && { displayName: org.displayName }),
                ...(org.dateLastActivity != null && { dateLastActivity: org.dateLastActivity }),
                ...(org.url != null && { url: org.url }),
                ...(org.idEnterprise != null && { idEnterprise: org.idEnterprise }),
                ...(org.offering != null && { offering: org.offering }),
                ...(org.idBoards != null && { idBoards: org.idBoards }),
                ...(org.memberships != null && { memberships: org.memberships }),
                ...(org.premiumFeatures != null && { premiumFeatures: org.premiumFeatures }),
                ...(org.prefs != null && { prefs: org.prefs })
            };
        });

        const hasMore = input.limit !== undefined && items.length >= input.limit;

        return {
            items,
            ...(hasMore && {
                nextCursor: String((input.cursor !== undefined ? parseInt(input.cursor, 10) : 0) + 1)
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
