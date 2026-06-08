import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the organization (workspace). Example: "6a26ebb15b58213488fb7401"')
});

const ProviderOrganizationSchema = z.object({
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

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Organization not found',
                id: input.id
            });
        }

        const providerOrg = ProviderOrganizationSchema.parse(response.data);

        return {
            id: providerOrg.id,
            ...(providerOrg.name !== undefined && { name: providerOrg.name }),
            ...(providerOrg.displayName !== undefined && { displayName: providerOrg.displayName }),
            ...(providerOrg.dateLastActivity !== undefined && { dateLastActivity: providerOrg.dateLastActivity }),
            ...(providerOrg.prefs !== undefined && { prefs: providerOrg.prefs }),
            ...(providerOrg.idEnterprise !== undefined && { idEnterprise: providerOrg.idEnterprise }),
            ...(providerOrg.offering !== undefined && { offering: providerOrg.offering }),
            ...(providerOrg.url !== undefined && { url: providerOrg.url }),
            ...(providerOrg.idBoards !== undefined && { idBoards: providerOrg.idBoards }),
            ...(providerOrg.memberships !== undefined && { memberships: providerOrg.memberships }),
            ...(providerOrg.premiumFeatures !== undefined && { premiumFeatures: providerOrg.premiumFeatures })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
