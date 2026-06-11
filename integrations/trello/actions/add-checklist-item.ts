import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    checklistId: z.string().describe('Checklist ID. Example: "6a26f332aa39a5f5b4c671bf"'),
    name: z.string().describe('Name of the checklist item.'),
    pos: z.union([z.string(), z.number()]).optional().describe('Position of the item. Example: "bottom", "top", or a number.'),
    checked: z.boolean().optional().describe('Whether the item is checked. Defaults to false.')
});

const ProviderCheckItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    pos: z.number(),
    type: z.string().optional(),
    due: z.string().nullable().optional(),
    dueReminder: z.number().nullable().optional(),
    idMember: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    pos: z.number(),
    type: z.string().optional(),
    due: z.string().nullable().optional(),
    dueReminder: z.number().nullable().optional(),
    idMember: z.string().nullable().optional()
});

const action = createAction({
    description: 'Add an item to a Trello checklist.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-checklist-item',
        group: 'Checklists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-checklists/#api-checklists-id-checkitems-post
            endpoint: `/1/checklists/${encodeURIComponent(input.checklistId)}/checkItems`,
            data: {
                name: input.name,
                ...(input.pos !== undefined && { pos: input.pos }),
                ...(input.checked !== undefined && { checked: input.checked })
            },
            retries: 10
        });

        const providerItem = ProviderCheckItemSchema.parse(response.data);

        return {
            id: providerItem.id,
            name: providerItem.name,
            state: providerItem.state,
            pos: providerItem.pos,
            ...(providerItem.type !== undefined && { type: providerItem.type }),
            ...(providerItem.due !== undefined && { due: providerItem.due }),
            ...(providerItem.dueReminder !== undefined && { dueReminder: providerItem.dueReminder }),
            ...(providerItem.idMember !== undefined && { idMember: providerItem.idMember })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
