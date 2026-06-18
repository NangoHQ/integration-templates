import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cardId: z.string().describe('Card ID. Example: "6a26f2fdbc520ab9f45a5214"'),
    checklistItemId: z.string().describe('Checklist item ID. Example: "6a26f370f88b34e822126264"'),
    name: z.string().optional().describe('New name for the checklist item.'),
    state: z.enum(['complete', 'incomplete']).optional().describe('State of the checklist item.'),
    pos: z.union([z.string(), z.number()]).optional().describe('Position of the checklist item.'),
    due: z.string().optional().describe('Due date for the checklist item.'),
    idMember: z.string().optional().describe('Member ID to assign to the checklist item.')
});

const ProviderCheckItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    idChecklist: z.string(),
    pos: z.union([z.string(), z.number()]),
    due: z.string().nullable().optional(),
    idMember: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    state: z.string().optional(),
    idChecklist: z.string().optional(),
    pos: z.union([z.string(), z.number()]).optional(),
    due: z.string().optional(),
    idMember: z.string().optional()
});

const action = createAction({
    description: 'Update a checklist item on a Trello card.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-checkitem-idcheckitem-put
            endpoint: `/1/cards/${encodeURIComponent(input.cardId)}/checkItem/${encodeURIComponent(input.checklistItemId)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.state !== undefined && { state: input.state }),
                ...(input.pos !== undefined && { pos: input.pos }),
                ...(input.due !== undefined && { due: input.due }),
                ...(input.idMember !== undefined && { idMember: input.idMember })
            },
            retries: 3
        });

        const providerCheckItem = ProviderCheckItemSchema.parse(response.data);

        return {
            id: providerCheckItem.id,
            name: providerCheckItem.name,
            state: providerCheckItem.state,
            idChecklist: providerCheckItem.idChecklist,
            pos: providerCheckItem.pos,
            ...(providerCheckItem.due != null && { due: providerCheckItem.due }),
            ...(providerCheckItem.idMember != null && { idMember: providerCheckItem.idMember })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
