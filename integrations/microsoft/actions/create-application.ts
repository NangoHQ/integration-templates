import { z } from 'zod';
import { createAction } from 'nango';

const SignInAudienceLiteral = z.union([
    z.literal('AzureADMyOrg'),
    z.literal('AzureADMultipleOrgs'),
    z.literal('AzureADandPersonalMicrosoftAccount'),
    z.literal('PersonalMicrosoftAccount')
]);

const GroupMembershipClaimsLiteral = z.union([z.literal('None'), z.literal('SecurityGroup'), z.literal('All')]);

const InputSchema = z.object({
    displayName: z.string().describe('The display name for the application. Example: "My Application"'),
    description: z.string().optional().describe('Free text field to provide a description of the application. Example: "Application description"'),
    signInAudience: SignInAudienceLiteral.optional().describe('Specifies the Microsoft accounts supported. Example: "AzureADandPersonalMicrosoftAccount"'),
    identifierUris: z.array(z.string()).optional().describe('Also known as App ID URI, this value acts as the prefix for scopes. Example: ["api://myapp"]'),
    web: z
        .object({
            redirectUris: z.array(z.string()).optional().describe('The redirect URIs for web applications.'),
            homePageUrl: z.string().optional().describe('Home page URL of the application.'),
            logoutUrl: z.string().optional().describe('URL for logout.'),
            implicitGrantSettings: z
                .object({
                    enableIdTokenIssuance: z.boolean().optional(),
                    enableAccessTokenIssuance: z.boolean().optional()
                })
                .optional()
        })
        .optional()
        .describe('Specifies settings for a web application.'),
    spa: z
        .object({
            redirectUris: z.array(z.string()).optional().describe('The redirect URIs for single-page applications.')
        })
        .optional()
        .describe('Specifies settings for a single-page application.'),
    publicClient: z
        .object({
            redirectUris: z.array(z.string()).optional().describe('The redirect URIs for public client applications.')
        })
        .optional()
        .describe('Specifies settings for public clients (mobile/desktop apps).'),
    api: z
        .object({
            requestedAccessTokenVersion: z.number().optional().describe('The access token version expected.'),
            oauth2PermissionScopes: z
                .array(
                    z.object({
                        id: z.string(),
                        value: z.string(),
                        type: z.string().optional(),
                        adminConsentDescription: z.string().optional(),
                        adminConsentDisplayName: z.string().optional(),
                        userConsentDescription: z.string().optional(),
                        userConsentDisplayName: z.string().optional(),
                        isEnabled: z.boolean().optional()
                    })
                )
                .optional()
        })
        .optional()
        .describe('Specifies settings for an application that implements a web API.'),
    tags: z.array(z.string()).optional().describe('Custom strings to categorize the application. Example: ["production"]'),
    groupMembershipClaims: GroupMembershipClaimsLiteral.optional().describe('Configures the groups claim issued in tokens. Example: "SecurityGroup"'),
    requiredResourceAccess: z
        .array(
            z.object({
                resourceAppId: z.string(),
                resourceAccess: z.array(
                    z.object({
                        id: z.string(),
                        type: z.union([z.literal('Scope'), z.literal('Role')])
                    })
                )
            })
        )
        .optional()
        .describe('Resources that the application needs to access.'),
    passwordCredentials: z
        .array(
            z.object({
                displayName: z.string().describe('Display name for the password. Example: "Password 1"'),
                endDateTime: z.string().optional().describe('End date time in ISO 8601 format.'),
                startDateTime: z.string().optional().describe('Start date time in ISO 8601 format.')
            })
        )
        .optional()
        .describe('Password credentials for the application.'),
    isFallbackPublicClient: z.boolean().optional().describe('Specifies whether to fall back to public client type.'),
    notes: z.string().optional().describe('Notes for management of the application.'),
    samlMetadataUrl: z.string().optional().describe('URL where the service exposes SAML metadata.'),
    serviceManagementReference: z.string().optional().describe('References app contact info from a Service Management database.')
});

const UnknownRecordSchema = z.record(z.string(), z.unknown());

const ProviderApplicationSchema = z.object({
    id: z.string(),
    appId: z.string(),
    displayName: z.string(),
    description: z.string().nullable().optional(),
    createdDateTime: z.string().optional(),
    deletedDateTime: z.string().nullable().optional(),
    identifierUris: z.array(z.string()).optional(),
    signInAudience: z.string().optional(),
    publisherDomain: z.string().optional(),
    applicationTemplateId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    groupMembershipClaims: z.string().nullable().optional(),
    isFallbackPublicClient: z.boolean().nullable().optional(),
    isDeviceOnlyAuthSupported: z.boolean().nullable().optional(),
    notes: z.string().nullable().optional(),
    samlMetadataUrl: z.string().nullable().optional(),
    serviceManagementReference: z.string().nullable().optional(),
    web: UnknownRecordSchema.nullable().optional(),
    spa: UnknownRecordSchema.nullable().optional(),
    publicClient: UnknownRecordSchema.nullable().optional(),
    api: UnknownRecordSchema.nullable().optional(),
    passwordCredentials: z.array(UnknownRecordSchema).optional(),
    keyCredentials: z.array(UnknownRecordSchema).optional(),
    appRoles: z.array(UnknownRecordSchema).optional(),
    requiredResourceAccess: z.array(UnknownRecordSchema).optional(),
    parentalControlSettings: UnknownRecordSchema.nullable().optional(),
    info: UnknownRecordSchema.nullable().optional(),
    verifiedPublisher: UnknownRecordSchema.nullable().optional(),
    uniqueName: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('Unique identifier for the application object. Example: "03ef14b0-ca33-4840-8f4f-d6e91916010e"'),
    appId: z.string().describe('The unique identifier for the application assigned by Microsoft Entra ID. Example: "631a96bc-a705-4eda-9f99-fdaf9f54f6a2"'),
    displayName: z.string().describe('The display name for the application.'),
    description: z.string().optional(),
    createdDateTime: z.string().optional(),
    identifierUris: z.array(z.string()).optional(),
    signInAudience: z.string().optional(),
    publisherDomain: z.string().optional(),
    tags: z.array(z.string()).optional(),
    web: UnknownRecordSchema.nullable().optional(),
    spa: UnknownRecordSchema.nullable().optional(),
    publicClient: UnknownRecordSchema.nullable().optional(),
    api: UnknownRecordSchema.nullable().optional(),
    passwordCredentials: z.array(UnknownRecordSchema).optional(),
    keyCredentials: z.array(UnknownRecordSchema).optional(),
    appRoles: z.array(UnknownRecordSchema).optional(),
    requiredResourceAccess: z.array(UnknownRecordSchema).optional(),
    isFallbackPublicClient: z.boolean().optional(),
    groupMembershipClaims: z.string().optional(),
    notes: z.string().optional(),
    samlMetadataUrl: z.string().optional(),
    serviceManagementReference: z.string().optional()
});

const action = createAction({
    description: 'Create a new application in Microsoft Entra ID',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Application.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            displayName: input.displayName
        };

        if (input.description !== undefined) {
            payload['description'] = input.description;
        }
        if (input.signInAudience !== undefined) {
            payload['signInAudience'] = input.signInAudience;
        }
        if (input.identifierUris !== undefined) {
            payload['identifierUris'] = input.identifierUris;
        }
        if (input.web !== undefined) {
            payload['web'] = input.web;
        }
        if (input.spa !== undefined) {
            payload['spa'] = input.spa;
        }
        if (input.publicClient !== undefined) {
            payload['publicClient'] = input.publicClient;
        }
        if (input.api !== undefined) {
            payload['api'] = input.api;
        }
        if (input.tags !== undefined) {
            payload['tags'] = input.tags;
        }
        if (input.groupMembershipClaims !== undefined) {
            payload['groupMembershipClaims'] = input.groupMembershipClaims;
        }
        if (input.requiredResourceAccess !== undefined) {
            payload['requiredResourceAccess'] = input.requiredResourceAccess;
        }
        if (input.passwordCredentials !== undefined) {
            payload['passwordCredentials'] = input.passwordCredentials;
        }
        if (input.isFallbackPublicClient !== undefined) {
            payload['isFallbackPublicClient'] = input.isFallbackPublicClient;
        }
        if (input.notes !== undefined) {
            payload['notes'] = input.notes;
        }
        if (input.samlMetadataUrl !== undefined) {
            payload['samlMetadataUrl'] = input.samlMetadataUrl;
        }
        if (input.serviceManagementReference !== undefined) {
            payload['serviceManagementReference'] = input.serviceManagementReference;
        }

        // https://learn.microsoft.com/en-us/graph/api/application-post-applications
        const response = await nango.post({
            endpoint: '/v1.0/applications',
            data: payload,
            retries: 10
        });

        const providerApplication = ProviderApplicationSchema.parse(response.data);

        return {
            id: providerApplication.id,
            appId: providerApplication.appId,
            displayName: providerApplication.displayName,
            ...(providerApplication['description'] != null && { description: providerApplication['description'] }),
            ...(providerApplication['createdDateTime'] != null && { createdDateTime: providerApplication['createdDateTime'] }),
            ...(providerApplication['identifierUris'] != null && { identifierUris: providerApplication['identifierUris'] }),
            ...(providerApplication['signInAudience'] != null && { signInAudience: providerApplication['signInAudience'] }),
            ...(providerApplication['publisherDomain'] != null && { publisherDomain: providerApplication['publisherDomain'] }),
            ...(providerApplication['tags'] != null && { tags: providerApplication['tags'] }),
            ...(providerApplication['web'] != null && { web: providerApplication['web'] }),
            ...(providerApplication['spa'] != null && { spa: providerApplication['spa'] }),
            ...(providerApplication['publicClient'] != null && { publicClient: providerApplication['publicClient'] }),
            ...(providerApplication['api'] != null && { api: providerApplication['api'] }),
            ...(providerApplication['passwordCredentials'] != null && {
                passwordCredentials: providerApplication['passwordCredentials']
            }),
            ...(providerApplication['keyCredentials'] != null && { keyCredentials: providerApplication['keyCredentials'] }),
            ...(providerApplication['appRoles'] != null && { appRoles: providerApplication['appRoles'] }),
            ...(providerApplication['requiredResourceAccess'] != null && {
                requiredResourceAccess: providerApplication['requiredResourceAccess']
            }),
            ...(providerApplication['isFallbackPublicClient'] != null && {
                isFallbackPublicClient: providerApplication['isFallbackPublicClient']
            }),
            ...(providerApplication['groupMembershipClaims'] != null && {
                groupMembershipClaims: providerApplication['groupMembershipClaims']
            }),
            ...(providerApplication['notes'] != null && { notes: providerApplication['notes'] }),
            ...(providerApplication['samlMetadataUrl'] != null && { samlMetadataUrl: providerApplication['samlMetadataUrl'] }),
            ...(providerApplication['serviceManagementReference'] != null && {
                serviceManagementReference: providerApplication['serviceManagementReference']
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
