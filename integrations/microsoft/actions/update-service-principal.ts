import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    servicePrincipalId: z.string().min(1).describe('The unique identifier for the service principal. Example: "8c7410b7-37cd-4463-981d-74cd6ab033a7"'),
    accountEnabled: z.boolean().optional().describe('Whether the service principal account is enabled.'),
    appRoleAssignmentRequired: z
        .boolean()
        .optional()
        .describe('Whether an appRoleAssignment is required before Microsoft Entra ID will issue a user or access token.'),
    displayName: z.string().optional().describe('The display name for the service principal.'),
    homepage: z.string().optional().describe('Home page or landing page of the application.'),
    logoutUrl: z.string().optional().describe('URL used by Microsoft authorization service to log out a user.'),
    preferredSingleSignOnMode: z.string().optional().describe('Single sign-on mode configured for this application. Values: password, saml, external, oidc.'),
    replyUrls: z.array(z.string()).optional().describe('URLs that user tokens are sent to for sign in, or redirect URIs for OAuth 2.0 codes and tokens.'),
    servicePrincipalNames: z.array(z.string()).optional().describe('List of identifiersUris copied from the associated application.'),
    tags: z.array(z.string()).optional().describe('Custom strings used to categorize and identify the application.'),
    alternativeNames: z
        .array(z.string())
        .optional()
        .describe('Used to retrieve service principals by subscription, identify resource group and full resource IDs.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    servicePrincipalId: z.string(),
    updatedFields: z.array(z.string())
});

const action = createAction({
    description: 'Update a service principal in Microsoft Entra ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Application.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.accountEnabled !== undefined) {
            updateData['accountEnabled'] = input.accountEnabled;
        }
        if (input.appRoleAssignmentRequired !== undefined) {
            updateData['appRoleAssignmentRequired'] = input.appRoleAssignmentRequired;
        }
        if (input.displayName !== undefined) {
            updateData['displayName'] = input.displayName;
        }
        if (input.homepage !== undefined) {
            updateData['homepage'] = input.homepage;
        }
        if (input.logoutUrl !== undefined) {
            updateData['logoutUrl'] = input.logoutUrl;
        }
        if (input.preferredSingleSignOnMode !== undefined) {
            updateData['preferredSingleSignOnMode'] = input.preferredSingleSignOnMode;
        }
        if (input.replyUrls !== undefined) {
            updateData['replyUrls'] = input.replyUrls;
        }
        if (input.servicePrincipalNames !== undefined) {
            updateData['servicePrincipalNames'] = input.servicePrincipalNames;
        }
        if (input.tags !== undefined) {
            updateData['tags'] = input.tags;
        }
        if (input.alternativeNames !== undefined) {
            updateData['alternativeNames'] = input.alternativeNames;
        }

        const updatedFields = Object.keys(updateData);

        if (updatedFields.length === 0) {
            throw new nango.ActionError({
                type: 'no_update_fields',
                message: 'At least one field to update must be provided.'
            });
        }

        // https://learn.microsoft.com/en-us/graph/api/serviceprincipal-update
        const response = await nango.patch({
            endpoint: `/v1.0/servicePrincipals/${encodeURIComponent(input.servicePrincipalId)}`,
            data: updateData,
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: `Expected status 204 but received ${response.status}`,
                status: response.status
            });
        }

        return {
            success: true,
            servicePrincipalId: input.servicePrincipalId,
            updatedFields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
