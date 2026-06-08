import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Board ID. Example: "6a26ebb3cd5f60a53a585978"'),
    name: z.string().optional().describe('Name of the board'),
    desc: z.string().optional().describe('Description of the board'),
    closed: z.boolean().optional().describe('Whether the board is closed'),
    prefs_permissionLevel: z.string().optional().describe('Permission level. Example: "private", "org", "public"'),
    prefs_voting: z.string().optional().describe('Voting preference. Example: "disabled", "members", "org", "public"'),
    prefs_comments: z.string().optional().describe('Comments preference. Example: "disabled", "members", "org", "public", "observers"')
});

const ProviderBoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string(),
    closed: z.boolean(),
    url: z.string().optional(),
    shortUrl: z.string().optional(),
    prefs: z
        .object({
            permissionLevel: z.string().optional(),
            voting: z.string().optional(),
            comments: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string(),
    closed: z.boolean(),
    url: z.string().optional(),
    shortUrl: z.string().optional(),
    prefs_permissionLevel: z.string().optional(),
    prefs_voting: z.string().optional(),
    prefs_comments: z.string().optional()
});

const action = createAction({
    description: 'Update a Trello board',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-board',
        group: 'Boards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/
        const response = await nango.put({
            endpoint: `/1/boards/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.desc !== undefined && { desc: input.desc }),
                ...(input.closed !== undefined && { closed: input.closed }),
                ...(input.prefs_permissionLevel !== undefined && { 'prefs/permissionLevel': input.prefs_permissionLevel }),
                ...(input.prefs_voting !== undefined && { 'prefs/voting': input.prefs_voting }),
                ...(input.prefs_comments !== undefined && { 'prefs/comments': input.prefs_comments })
            },
            retries: 3
        });

        const board = ProviderBoardSchema.parse(response.data);

        return {
            id: board.id,
            name: board.name,
            desc: board.desc,
            closed: board.closed,
            url: board.url,
            shortUrl: board.shortUrl,
            ...(board.prefs?.permissionLevel !== undefined && { prefs_permissionLevel: board.prefs.permissionLevel }),
            ...(board.prefs?.voting !== undefined && { prefs_voting: board.prefs.voting }),
            ...(board.prefs?.comments !== undefined && { prefs_comments: board.prefs.comments })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
