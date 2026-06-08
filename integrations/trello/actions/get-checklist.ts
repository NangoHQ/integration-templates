import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the checklist to retrieve. Example: "6a26f332aa39a5f5b4c671bf"')
});

const CheckItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    idChecklist: z.string(),
    pos: z.number(),
    due: z.string().optional().nullable(),
    idMember: z.string().optional().nullable()
});

const ProviderChecklistSchema = z.object({
    id: z.string(),
    name: z.string(),
    idBoard: z.string(),
    idCard: z.string(),
    pos: z.number(),
    checkItems: z.array(CheckItemSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    idBoard: z.string(),
    idCard: z.string(),
    pos: z.number(),
    checkItems: z.array(CheckItemSchema).optional()
});

const action = createAction({
    description: 'Retrieve a single checklist from Trello.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-checklist',
        group: 'Checklists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-checklists/#api-checklists-id-get
            endpoint: `/1/checklists/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Checklist not found',
                id: input.id
            });
        }

        const checklist = ProviderChecklistSchema.parse(response.data);

        return {
            id: checklist.id,
            name: checklist.name,
            idBoard: checklist.idBoard,
            idCard: checklist.idCard,
            pos: checklist.pos,
            ...(checklist.checkItems !== undefined && { checkItems: checklist.checkItems })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
