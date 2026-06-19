import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    directoryRoleId: z.string().min(1).describe('The unique identifier of the directory role. Example: "c35aa61d-9e3d-419e-84a9-24767a8a9988"'),
    cursor: z.string().optional().describe('Pagination cursor (skipToken) from the previous response. Omit for the first page.')
});

const ProviderMemberSchema = z.object({
    id: z.string(),
    '@odata.type': z.string().optional(),
    displayName: z.string().optional().nullable(),
    mail: z.string().optional().nullable(),
    userPrincipalName: z.string().optional().nullable(),
    appId: z.string().optional().nullable(),
    servicePrincipalType: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderMemberSchema),
    '@odata.nextLink': z.string().optional()
});

const MemberSchema = z.object({
    id: z.string(),
    type: z.enum(['user', 'servicePrincipal']),
    displayName: z.string().optional(),
    email: z.string().optional(),
    userPrincipalName: z.string().optional(),
    appId: z.string().optional(),
    servicePrincipalType: z.string().optional()
});

const OutputSchema = z.object({
    members: z.array(MemberSchema),
    nextLink: z.string().optional()
});

const action = createAction({
    description: 'List all members (users and service principals) assigned to a directory role in Microsoft.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['RoleManagement.Read.Directory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        if (input.cursor) {
            // https://learn.microsoft.com/en-us/graph/api/directoryrole-list-members
            response = await nango.get({ endpoint: input.cursor, retries: 3 });
        } else {
            // https://learn.microsoft.com/en-us/graph/api/directoryrole-list-members
            response = await nango.get({
                endpoint: `/v1.0/directoryRoles/${encodeURIComponent(input.directoryRoleId)}/members`,
                retries: 3
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const members: Array<z.infer<typeof MemberSchema>> = providerResponse.value.map((member) => {
            const odataType = member['@odata.type'] || '';
            const isServicePrincipal = odataType.includes('servicePrincipal') || odataType.includes('ServicePrincipal');

            return {
                id: member.id,
                type: isServicePrincipal ? 'servicePrincipal' : 'user',
                ...(member.displayName != null && { displayName: member.displayName }),
                ...(member.mail != null && { email: member.mail }),
                ...(member.userPrincipalName != null && { userPrincipalName: member.userPrincipalName }),
                ...(member.appId != null && { appId: member.appId }),
                ...(member.servicePrincipalType != null && { servicePrincipalType: member.servicePrincipalType })
            };
        });

        return {
            members,
            ...(providerResponse['@odata.nextLink'] != null && { nextLink: providerResponse['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
