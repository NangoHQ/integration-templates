import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor for the next page of results. Pass the value from @odata.nextLink or next_cursor.')
});

// Schema for the raw response from Microsoft Graph API
const ProviderServicePrincipalSchema = z.object({
    id: z.string(),
    appId: z.string(),
    displayName: z.string().nullable().optional(),
    appDisplayName: z.string().nullable().optional(),
    servicePrincipalType: z.string().nullable().optional(),
    accountEnabled: z.boolean().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    loginUrl: z.string().nullable().optional(),
    logoutUrl: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    notificationEmailAddresses: z.array(z.string()).nullable().optional(),
    preferredSingleSignOnMode: z.string().nullable().optional(),
    publisherName: z.string().nullable().optional(),
    signInAudience: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional()
});

// Schema for the raw API response
const ProviderResponseSchema = z.object({
    value: z.array(ProviderServicePrincipalSchema),
    '@odata.nextLink': z.string().optional()
});

const ServicePrincipalSchema = z.object({
    id: z.string().describe('The unique identifier for the service principal'),
    appId: z.string().describe('The application ID of the application associated with this service principal'),
    displayName: z.string().optional().describe('The display name for the service principal'),
    appDisplayName: z.string().optional().describe('The application display name'),
    servicePrincipalType: z.string().optional().describe('The type of service principal: Application or ManagedIdentity'),
    accountEnabled: z.boolean().optional().describe('Whether the service principal account is enabled'),
    createdDateTime: z.string().optional().describe('The date and time the service principal was created'),
    description: z.string().optional().describe('A description for the service principal'),
    loginUrl: z.string().optional().describe('The URL that users are redirected to when signing in to the application'),
    logoutUrl: z.string().optional().describe('The URL that users are redirected to when signing out of the application'),
    notes: z.string().optional().describe('Free text field to capture information about the service principal'),
    notificationEmailAddresses: z.array(z.string()).optional().describe('Email addresses to which notifications are sent'),
    preferredSingleSignOnMode: z.string().optional().describe('The preferred single sign-on mode for the application'),
    publisherName: z.string().optional().describe('The publisher name of the application associated with this service principal'),
    signInAudience: z.string().optional().describe('The sign-in audience for the application'),
    tags: z.array(z.string()).optional().describe('Custom strings that can be used to categorize and identify the service principal')
});

const OutputSchema = z.object({
    items: z.array(ServicePrincipalSchema),
    nextCursor: z
        .string()
        .optional()
        .describe('Pagination cursor to retrieve the next page of results. Pass this value as the cursor parameter in the next request.')
});

const action = createAction({
    description: 'List service principals from Microsoft Graph',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Application.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        if (input.cursor) {
            // https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list
            response = await nango.get({ endpoint: input.cursor, retries: 3 });
        } else {
            // https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list
            response = await nango.get({ endpoint: '/v1.0/servicePrincipals', retries: 3 });
        }

        const data = ProviderResponseSchema.parse(response.data);

        const servicePrincipals = data.value.map((sp) => ({
            id: sp.id,
            appId: sp.appId,
            ...(sp.displayName !== undefined && sp.displayName !== null && { displayName: sp.displayName }),
            ...(sp.appDisplayName !== undefined && sp.appDisplayName !== null && { appDisplayName: sp.appDisplayName }),
            ...(sp.servicePrincipalType !== undefined && sp.servicePrincipalType !== null && { servicePrincipalType: sp.servicePrincipalType }),
            ...(sp.accountEnabled !== undefined && sp.accountEnabled !== null && { accountEnabled: sp.accountEnabled }),
            ...(sp.createdDateTime !== undefined && sp.createdDateTime !== null && { createdDateTime: sp.createdDateTime }),
            ...(sp.description !== undefined && sp.description !== null && { description: sp.description }),
            ...(sp.loginUrl !== undefined && sp.loginUrl !== null && { loginUrl: sp.loginUrl }),
            ...(sp.logoutUrl !== undefined && sp.logoutUrl !== null && { logoutUrl: sp.logoutUrl }),
            ...(sp.notes !== undefined && sp.notes !== null && { notes: sp.notes }),
            ...(sp.notificationEmailAddresses !== undefined &&
                sp.notificationEmailAddresses !== null && { notificationEmailAddresses: sp.notificationEmailAddresses }),
            ...(sp.preferredSingleSignOnMode !== undefined &&
                sp.preferredSingleSignOnMode !== null && { preferredSingleSignOnMode: sp.preferredSingleSignOnMode }),
            ...(sp.publisherName !== undefined && sp.publisherName !== null && { publisherName: sp.publisherName }),
            ...(sp.signInAudience !== undefined && sp.signInAudience !== null && { signInAudience: sp.signInAudience }),
            ...(sp.tags !== undefined && sp.tags !== null && { tags: sp.tags })
        }));

        return {
            items: servicePrincipals,
            ...(data['@odata.nextLink'] !== undefined && { nextCursor: data['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
