import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().min(1).describe('The unique identifier of the group. Example: "51d82e22-a356-4506-afa1-2c3992bed3d7"'),
    cursor: z.string().optional().describe('Pagination cursor (skipToken) from the previous response. Omit for the first page.')
});

const ProviderMemberSchema = z.object({
    id: z.string(),
    '@odata.type': z.string().optional(),
    displayName: z.string().nullish(),
    mail: z.string().nullish(),
    userPrincipalName: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderMemberSchema),
    '@odata.nextLink': z.string().optional()
});

const MemberSchema = z.object({
    id: z.string().describe('The unique identifier of the member'),
    type: z.string().optional().describe('The type of directory object (e.g., #microsoft.graph.user, #microsoft.graph.group)'),
    displayName: z.string().optional().describe('The display name of the member'),
    mail: z.string().optional().describe('The email address of the member'),
    userPrincipalName: z.string().optional().describe('The user principal name of the member')
});

const OutputSchema = z.object({
    members: z.array(MemberSchema).describe('List of direct members of the group'),
    nextLink: z.string().optional().describe('URL to retrieve the next page of results, if more members exist')
});

const action = createAction({
    description: 'List all direct members of a group in Microsoft',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['GroupMember.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        if (input.cursor) {
            // https://learn.microsoft.com/en-us/graph/api/group-list-members
            response = await nango.get({ endpoint: input.cursor, retries: 3 });
        } else {
            // https://learn.microsoft.com/en-us/graph/api/group-list-members
            response = await nango.get({
                endpoint: `/v1.0/groups/${encodeURIComponent(input.groupId)}/members`,
                params: { $select: 'id,displayName,mail,userPrincipalName' },
                retries: 3
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const members = providerResponse.value.map((item) => {
            const member: z.infer<typeof MemberSchema> = {
                id: item.id,
                ...(item['@odata.type'] !== undefined && { type: item['@odata.type'] }),
                ...(item.displayName !== undefined && item.displayName !== null && { displayName: item.displayName }),
                ...(item.mail !== undefined && item.mail !== null && { mail: item.mail }),
                ...(item.userPrincipalName !== undefined && item.userPrincipalName !== null && { userPrincipalName: item.userPrincipalName })
            };
            return member;
        });

        return {
            members,
            ...(providerResponse['@odata.nextLink'] !== undefined && {
                nextLink: providerResponse['@odata.nextLink']
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
