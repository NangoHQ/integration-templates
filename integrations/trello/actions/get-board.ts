import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Board ID. Example: "5abbe4b7ddc1b351ef961414"')
});

const BoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().optional(),
    closed: z.boolean().optional(),
    idMemberCreator: z.string().optional(),
    idOrganization: z.string().optional(),
    pinned: z.boolean().optional(),
    url: z.string().optional(),
    shortUrl: z.string().optional(),
    starred: z.boolean().optional(),
    subscribed: z.boolean().optional(),
    dateLastActivity: z.string().optional(),
    dateLastView: z.string().optional(),
    shortLink: z.string().optional(),
    creationMethod: z.string().optional(),
    enterpriseOwned: z.boolean().optional(),
    ixUpdate: z.number().optional(),
    labelNames: z.record(z.string(), z.string()).optional(),
    prefs: z.object({}).passthrough().optional()
});

const action = createAction({
    description: 'Retrieve a single board from Trello.',
    version: '1.0.1',
    input: InputSchema,
    output: BoardSchema,

    exec: async (nango, input): Promise<z.infer<typeof BoardSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-get
            endpoint: `/1/boards/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const board = BoardSchema.parse(response.data);

        return board;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
