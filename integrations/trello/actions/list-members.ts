import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    boardId: z.string().describe('The ID of the Trello board. Example: "6a26ebb3cd5f60a53a585978"')
});

const ProviderMemberSchema = z.object({
    id: z.string(),
    fullName: z.string().optional(),
    username: z.string().optional(),
    avatarHash: z.string().optional(),
    initials: z.string().optional(),
    memberType: z.string().optional(),
    email: z.string().optional(),
    url: z.string().optional(),
    confirmed: z.boolean().optional(),
    bio: z.string().optional(),
    avatarUrl: z.string().optional(),
    status: z.string().optional(),
    gravatarHash: z.string().optional(),
    idOrganizations: z.array(z.string()).optional(),
    idEnterprisesAdmin: z.array(z.string()).optional()
});

const MemberSchema = z.object({
    id: z.string(),
    fullName: z.string().optional(),
    username: z.string().optional(),
    avatarHash: z.string().optional(),
    initials: z.string().optional(),
    memberType: z.string().optional(),
    email: z.string().optional(),
    url: z.string().optional(),
    confirmed: z.boolean().optional(),
    bio: z.string().optional(),
    avatarUrl: z.string().optional(),
    status: z.string().optional(),
    gravatarHash: z.string().optional(),
    idOrganizations: z.array(z.string()).optional(),
    idEnterprisesAdmin: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    members: z.array(MemberSchema)
});

const action = createAction({
    description: 'List members of a Trello board',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-members',
        group: 'Boards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-members-get
        const response = await nango.get({
            endpoint: `/1/boards/${encodeURIComponent(input.boardId)}/members`,
            retries: 3
        });

        const rawMembers = z.array(z.unknown()).parse(response.data);

        const members = rawMembers.map((raw) => {
            const member = ProviderMemberSchema.parse(raw);
            return {
                id: member.id,
                ...(member.fullName !== undefined && { fullName: member.fullName }),
                ...(member.username !== undefined && { username: member.username }),
                ...(member.avatarHash !== undefined && { avatarHash: member.avatarHash }),
                ...(member.initials !== undefined && { initials: member.initials }),
                ...(member.memberType !== undefined && { memberType: member.memberType }),
                ...(member.email !== undefined && { email: member.email }),
                ...(member.url !== undefined && { url: member.url }),
                ...(member.confirmed !== undefined && { confirmed: member.confirmed }),
                ...(member.bio !== undefined && { bio: member.bio }),
                ...(member.avatarUrl !== undefined && { avatarUrl: member.avatarUrl }),
                ...(member.status !== undefined && { status: member.status }),
                ...(member.gravatarHash !== undefined && { gravatarHash: member.gravatarHash }),
                ...(member.idOrganizations !== undefined && { idOrganizations: member.idOrganizations }),
                ...(member.idEnterprisesAdmin !== undefined && { idEnterprisesAdmin: member.idEnterprisesAdmin })
            };
        });

        return { members };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
