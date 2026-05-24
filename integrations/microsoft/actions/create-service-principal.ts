import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('The application ID to create a service principal for. Example: "dd6b0cea-e204-44c6-b2e0-1162323c22f4"')
});

const ProviderServicePrincipalSchema = z.object({
    id: z.string(),
    appId: z.string(),
    displayName: z.string().nullable().optional(),
    accountEnabled: z.boolean().nullable().optional(),
    appDisplayName: z.string().nullable().optional(),
    appOwnerOrganizationId: z.string().nullable().optional(),
    appRoleAssignmentRequired: z.boolean().nullable().optional(),
    deletedDateTime: z.string().nullable().optional(),
    homepage: z.string().nullable().optional(),
    logoutUrl: z.string().nullable().optional(),
    publisherName: z.string().nullable().optional(),
    replyUrls: z.array(z.string()).nullable().optional(),
    servicePrincipalNames: z.array(z.string()).nullable().optional(),
    tags: z.array(z.string()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    appId: z.string(),
    displayName: z.string().optional(),
    accountEnabled: z.boolean().optional(),
    appDisplayName: z.string().optional(),
    appOwnerOrganizationId: z.string().optional(),
    appRoleAssignmentRequired: z.boolean().optional()
});

const action = createAction({
    description: 'Create a service principal in Microsoft Entra ID for an existing application.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-service-principal',
        group: 'Service Principals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Application.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/serviceprincipal-post-serviceprincipals
        const response = await nango.post({
            endpoint: '/v1.0/servicePrincipals',
            data: {
                appId: input.appId
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create service principal',
                appId: input.appId
            });
        }

        const providerSp = ProviderServicePrincipalSchema.parse(response.data);

        return {
            id: providerSp.id,
            appId: providerSp.appId,
            ...(providerSp.displayName != null && { displayName: providerSp.displayName }),
            ...(providerSp.accountEnabled != null && { accountEnabled: providerSp.accountEnabled }),
            ...(providerSp.appDisplayName != null && { appDisplayName: providerSp.appDisplayName }),
            ...(providerSp.appOwnerOrganizationId != null && { appOwnerOrganizationId: providerSp.appOwnerOrganizationId }),
            ...(providerSp.appRoleAssignmentRequired != null && { appRoleAssignmentRequired: providerSp.appRoleAssignmentRequired })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
