import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Checklist ID. Example: "6a26f332aa39a5f5b4c671bf"'),
    name: z.string().optional().describe('New name for the checklist'),
    pos: z.union([z.string(), z.number()]).optional().describe('Position of the checklist on the card. Example: "top", "bottom", or 16384')
});

const ProviderChecklistSchema = z.object({
    id: z.string(),
    name: z.string(),
    idBoard: z.string(),
    idCard: z.string(),
    pos: z.number()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    idBoard: z.string(),
    idCard: z.string(),
    pos: z.number()
});

const action = createAction({
    description: 'Update a Trello checklist.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-checklist',
        group: 'Checklists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-checklists/#api-checklists-id-put
            endpoint: `/1/checklists/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.pos !== undefined && { pos: input.pos })
            },
            retries: 3
        });

        const checklist = ProviderChecklistSchema.parse(response.data);

        return {
            id: checklist.id,
            name: checklist.name,
            idBoard: checklist.idBoard,
            idCard: checklist.idCard,
            pos: checklist.pos
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
