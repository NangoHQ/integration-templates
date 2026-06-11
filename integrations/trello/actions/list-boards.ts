import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    filter: z.enum(['all', 'open', 'closed']).optional().describe('Filter boards by status. Example: "open"'),
    fields: z.string().optional().describe('Comma-separated list of board fields to include. Example: "name,desc,url"')
});

const RawBoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    shortUrl: z.string().optional().nullable(),
    idOrganization: z.string().optional().nullable(),
    closed: z.boolean().optional().nullable(),
    dateLastActivity: z.string().optional().nullable()
});

const BoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().optional(),
    url: z.string().optional(),
    shortUrl: z.string().optional(),
    idOrganization: z.string().optional(),
    closed: z.boolean().optional(),
    dateLastActivity: z.string().optional()
});

const OutputSchema = z.object({
    boards: z.array(BoardSchema)
});

const action = createAction({
    description: 'List boards for the authenticated Trello member.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-boards',
        group: 'Boards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-members/#api-members-id-boards-get
            endpoint: '/1/members/me/boards',
            params: {
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.fields !== undefined && { fields: input.fields })
            },
            retries: 3
        });

        const providerBoards = z.array(z.unknown()).parse(response.data);

        const boards = providerBoards.map((item) => {
            const raw = RawBoardSchema.parse(item);
            return {
                id: raw.id,
                name: raw.name,
                ...(raw.desc != null && { desc: raw.desc }),
                ...(raw.url != null && { url: raw.url }),
                ...(raw.shortUrl != null && { shortUrl: raw.shortUrl }),
                ...(raw.idOrganization != null && { idOrganization: raw.idOrganization }),
                ...(raw.closed != null && { closed: raw.closed }),
                ...(raw.dateLastActivity != null && { dateLastActivity: raw.dateLastActivity })
            };
        });

        return { boards };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
