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

const OutputSchema = z.object({
    members: z.array(ProviderMemberSchema)
});

const action = createAction({
    description: 'List members of a Trello board',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-members-get
        const response = await nango.get({
            endpoint: `/1/boards/${encodeURIComponent(input.boardId)}/members`,
            retries: 3
        });

        const members = z.array(ProviderMemberSchema).parse(response.data);

        return { members };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
