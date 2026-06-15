import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the organization (workspace). Example: "6a26ebb15b58213488fb7401"')
});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    dateLastActivity: z.string().nullable().optional(),
    prefs: z.record(z.string(), z.unknown()).nullable().optional(),
    idEnterprise: z.string().nullable().optional(),
    offering: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    idBoards: z.array(z.string()).nullable().optional(),
    memberships: z.array(z.unknown()).nullable().optional(),
    premiumFeatures: z.array(z.string()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    dateLastActivity: z.string().optional(),
    prefs: z.record(z.string(), z.unknown()).optional(),
    idEnterprise: z.string().optional(),
    offering: z.string().optional(),
    url: z.string().optional(),
    idBoards: z.array(z.string()).optional(),
    memberships: z.array(z.unknown()).optional(),
    premiumFeatures: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Retrieve a single organization (workspace) from Trello.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-organization',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-organizations/#api-organizations-id-get
            endpoint: `/1/organizations/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Organization not found',
                id: input.id
            });
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Trello returned status ${response.status} when retrieving organization.`
            });
        }

        const providerOrg = ProviderOrganizationSchema.parse(response.data);

        return {
            id: providerOrg.id,
            ...(providerOrg.name != null && { name: providerOrg.name }),
            ...(providerOrg.displayName != null && { displayName: providerOrg.displayName }),
            ...(providerOrg.dateLastActivity != null && { dateLastActivity: providerOrg.dateLastActivity }),
            ...(providerOrg.prefs != null && { prefs: providerOrg.prefs }),
            ...(providerOrg.idEnterprise != null && { idEnterprise: providerOrg.idEnterprise }),
            ...(providerOrg.offering != null && { offering: providerOrg.offering }),
            ...(providerOrg.url != null && { url: providerOrg.url }),
            ...(providerOrg.idBoards != null && { idBoards: providerOrg.idBoards }),
            ...(providerOrg.memberships != null && { memberships: providerOrg.memberships }),
            ...(providerOrg.premiumFeatures != null && { premiumFeatures: providerOrg.premiumFeatures })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
