import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Member ID. Use "me" for the authenticated user. Example: "5abbe4b7ddc1b351ef961414"')
});

const ProviderMemberSchema = z.object({
    id: z.string(),
    username: z.string(),
    fullName: z.string().nullish(),
    avatarUrl: z.string().nullish(),
    email: z.string().nullish(),
    confirmed: z.boolean().optional(),
    memberType: z.string().nullish(),
    url: z.string().nullish(),
    initials: z.string().nullish(),
    bio: z.string().nullish(),
    idBoards: z.array(z.string()).optional(),
    idOrganizations: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    username: z.string(),
    fullName: z.string().optional(),
    avatarUrl: z.string().optional(),
    email: z.string().optional(),
    confirmed: z.boolean().optional(),
    memberType: z.string().optional(),
    url: z.string().optional(),
    initials: z.string().optional(),
    bio: z.string().optional(),
    idBoards: z.array(z.string()).optional(),
    idOrganizations: z.array(z.string()).optional()
});

const action = createAction({
    description: "Retrieve a Trello member by ID. Use 'me' to get the authenticated user.",
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-member',
        group: 'Members'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-members/#api-members-id-get
            endpoint: `/1/members/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Member not found',
                id: input.id
            });
        }

        const member = ProviderMemberSchema.parse(response.data);

        return {
            id: member.id,
            username: member.username,
            ...(member.fullName != null && { fullName: member.fullName }),
            ...(member.avatarUrl != null && { avatarUrl: member.avatarUrl }),
            ...(member.email != null && { email: member.email }),
            ...(member.confirmed !== undefined && { confirmed: member.confirmed }),
            ...(member.memberType != null && { memberType: member.memberType }),
            ...(member.url != null && { url: member.url }),
            ...(member.initials != null && { initials: member.initials }),
            ...(member.bio != null && { bio: member.bio }),
            ...(member.idBoards !== undefined && { idBoards: member.idBoards }),
            ...(member.idOrganizations !== undefined && { idOrganizations: member.idOrganizations })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
