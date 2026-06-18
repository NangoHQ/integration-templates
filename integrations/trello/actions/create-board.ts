import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('Name of the board. Example: "Project Roadmap"'),
    desc: z.string().optional().describe('Description for the board. Example: "Q3 planning board"'),
    idOrganization: z.string().optional().describe('ID of the organization to create the board in. Example: "6a26ebb15b58213488fb7401"'),
    defaultLists: z.boolean().optional().describe('Whether to add the default set of lists (To Do, Doing, Done). Defaults to true.'),
    prefs_permissionLevel: z.enum(['private', 'org', 'public']).optional().describe('Permission level of the board. Example: "private"')
});

const ProviderBoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().optional(),
    idOrganization: z.string().nullable().optional(),
    url: z.string().optional(),
    shortUrl: z.string().optional(),
    closed: z.boolean().optional(),
    pinned: z.boolean().optional(),
    starred: z.boolean().optional(),
    prefs: z
        .object({
            permissionLevel: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().optional(),
    idOrganization: z.string().nullable().optional(),
    url: z.string().optional(),
    shortUrl: z.string().optional(),
    closed: z.boolean().optional(),
    pinned: z.boolean().optional(),
    starred: z.boolean().optional(),
    permissionLevel: z.string().optional()
});

const action = createAction({
    description: 'Create a board in Trello.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-post
            endpoint: '/1/boards',
            data: {
                name: input.name,
                ...(input.desc !== undefined && { desc: input.desc }),
                ...(input.idOrganization !== undefined && { idOrganization: input.idOrganization }),
                ...(input.defaultLists !== undefined && { defaultLists: input.defaultLists }),
                ...(input.prefs_permissionLevel !== undefined && { prefs_permissionLevel: input.prefs_permissionLevel })
            },
            retries: 3
        });

        const providerBoard = ProviderBoardSchema.parse(response.data);

        return {
            id: providerBoard.id,
            name: providerBoard.name,
            ...(providerBoard.desc !== undefined && { desc: providerBoard.desc }),
            ...(providerBoard.idOrganization !== undefined && { idOrganization: providerBoard.idOrganization }),
            ...(providerBoard.url !== undefined && { url: providerBoard.url }),
            ...(providerBoard.shortUrl !== undefined && { shortUrl: providerBoard.shortUrl }),
            ...(providerBoard.closed !== undefined && { closed: providerBoard.closed }),
            ...(providerBoard.pinned !== undefined && { pinned: providerBoard.pinned }),
            ...(providerBoard.starred !== undefined && { starred: providerBoard.starred }),
            ...(providerBoard.prefs?.permissionLevel !== undefined && { permissionLevel: providerBoard.prefs.permissionLevel })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
