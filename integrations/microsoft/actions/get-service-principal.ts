import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    servicePrincipalId: z.string().describe('The unique identifier of the service principal. Example: "8c7410b7-37cd-4463-981d-74cd6ab033a7"')
});

const ProviderServicePrincipalSchema = z.object({
    id: z.string().optional(),
    appId: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    appDisplayName: z.string().nullable().optional(),
    servicePrincipalType: z.string().nullable().optional(),
    accountEnabled: z.boolean().nullable().optional(),
    alternativeNames: z.array(z.string()).optional(),
    appDescription: z.string().nullable().optional(),
    appOwnerOrganizationId: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    loginUrl: z.string().nullable().optional(),
    logoutUrl: z.string().nullable().optional(),
    notificationEmailAddresses: z.array(z.string()).optional(),
    preferredSingleSignOnMode: z.string().nullable().optional(),
    replyUrls: z.array(z.string()).optional(),
    servicePrincipalNames: z.array(z.string()).optional(),
    signInAudience: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    addIns: z.unknown().optional(),
    appRoles: z.unknown().optional(),
    info: z.unknown().optional(),
    keyCredentials: z.unknown().optional(),
    oauth2PermissionScopes: z.unknown().optional(),
    passwordCredentials: z.unknown().optional(),
    verifiedPublisher: z.unknown().optional(),
    createdDateTime: z.string().nullable().optional(),
    deletedDateTime: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier for the service principal.'),
    appId: z.string().optional(),
    displayName: z.string().optional(),
    appDisplayName: z.string().optional(),
    servicePrincipalType: z.string().optional(),
    accountEnabled: z.boolean().optional(),
    alternativeNames: z.array(z.string()).optional(),
    appDescription: z.string().optional(),
    appOwnerOrganizationId: z.string().optional(),
    description: z.string().optional(),
    loginUrl: z.string().optional(),
    logoutUrl: z.string().optional(),
    notificationEmailAddresses: z.array(z.string()).optional(),
    preferredSingleSignOnMode: z.string().optional(),
    replyUrls: z.array(z.string()).optional(),
    servicePrincipalNames: z.array(z.string()).optional(),
    signInAudience: z.string().optional(),
    tags: z.array(z.string()).optional(),
    addIns: z.unknown().optional(),
    appRoles: z.unknown().optional(),
    info: z.unknown().optional(),
    keyCredentials: z.unknown().optional(),
    oauth2PermissionScopes: z.unknown().optional(),
    passwordCredentials: z.unknown().optional(),
    verifiedPublisher: z.unknown().optional(),
    createdDateTime: z.string().optional(),
    deletedDateTime: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single service principal from Microsoft.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Application.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/serviceprincipal-get
        const response = await nango.get({
            endpoint: `/v1.0/servicePrincipals/${encodeURIComponent(input.servicePrincipalId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Service principal not found',
                servicePrincipalId: input.servicePrincipalId
            });
        }

        const sp = ProviderServicePrincipalSchema.parse(response.data);

        return {
            id: sp.id || '',
            ...(sp.appId != null && { appId: sp.appId }),
            ...(sp.displayName != null && { displayName: sp.displayName }),
            ...(sp.appDisplayName != null && { appDisplayName: sp.appDisplayName }),
            ...(sp.servicePrincipalType != null && { servicePrincipalType: sp.servicePrincipalType }),
            ...(sp.accountEnabled != null && { accountEnabled: sp.accountEnabled }),
            ...(sp.alternativeNames != null && { alternativeNames: sp.alternativeNames }),
            ...(sp.appDescription != null && { appDescription: sp.appDescription }),
            ...(sp.appOwnerOrganizationId != null && { appOwnerOrganizationId: sp.appOwnerOrganizationId }),
            ...(sp.description != null && { description: sp.description }),
            ...(sp.loginUrl != null && { loginUrl: sp.loginUrl }),
            ...(sp.logoutUrl != null && { logoutUrl: sp.logoutUrl }),
            ...(sp.notificationEmailAddresses != null && { notificationEmailAddresses: sp.notificationEmailAddresses }),
            ...(sp.preferredSingleSignOnMode != null && { preferredSingleSignOnMode: sp.preferredSingleSignOnMode }),
            ...(sp.replyUrls != null && { replyUrls: sp.replyUrls }),
            ...(sp.servicePrincipalNames != null && { servicePrincipalNames: sp.servicePrincipalNames }),
            ...(sp.signInAudience != null && { signInAudience: sp.signInAudience }),
            ...(sp.tags != null && { tags: sp.tags }),
            ...(sp.addIns != null && { addIns: sp.addIns }),
            ...(sp.appRoles != null && { appRoles: sp.appRoles }),
            ...(sp.info != null && { info: sp.info }),
            ...(sp.keyCredentials != null && { keyCredentials: sp.keyCredentials }),
            ...(sp.oauth2PermissionScopes != null && { oauth2PermissionScopes: sp.oauth2PermissionScopes }),
            ...(sp.passwordCredentials != null && { passwordCredentials: sp.passwordCredentials }),
            ...(sp.verifiedPublisher != null && { verifiedPublisher: sp.verifiedPublisher }),
            ...(sp.createdDateTime != null && { createdDateTime: sp.createdDateTime }),
            ...(sp.deletedDateTime != null && { deletedDateTime: sp.deletedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
