import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    checklistId: z.string().describe('The ID of the checklist. Example: "6a26f332aa39a5f5b4c671bf"'),
    checkItemId: z.string().describe('The ID of the check item. Example: "6a26f370f88b34e822126264"')
});

const ProviderCheckItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    pos: z.union([z.string(), z.number()]).optional(),
    idChecklist: z.string(),
    nameData: z.object({}).passthrough().optional(),
    due: z.string().nullable().optional(),
    dueReminder: z.number().nullable().optional(),
    idMember: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    pos: z.union([z.string(), z.number()]).optional(),
    idChecklist: z.string(),
    nameData: z.object({}).passthrough().optional(),
    due: z.string().optional(),
    dueReminder: z.number().optional(),
    idMember: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single checklist item from Trello.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-checklist-item',
        group: 'Checklists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-checklists/#api-checklists-id-checkitems-idcheckitem-get
            endpoint: `/1/checklists/${encodeURIComponent(input.checklistId)}/checkItems/${encodeURIComponent(input.checkItemId)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Checklist item not found',
                checklistId: input.checklistId,
                checkItemId: input.checkItemId
            });
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Trello returned status ${response.status} when retrieving checklist item.`
            });
        }

        const providerCheckItem = ProviderCheckItemSchema.parse(response.data);

        return {
            id: providerCheckItem.id,
            name: providerCheckItem.name,
            state: providerCheckItem.state,
            ...(providerCheckItem.pos !== undefined && { pos: providerCheckItem.pos }),
            idChecklist: providerCheckItem.idChecklist,
            ...(providerCheckItem.nameData !== undefined && { nameData: providerCheckItem.nameData }),
            ...(providerCheckItem.due !== null && providerCheckItem.due !== undefined && { due: providerCheckItem.due }),
            ...(providerCheckItem.dueReminder !== null && providerCheckItem.dueReminder !== undefined && { dueReminder: providerCheckItem.dueReminder }),
            ...(providerCheckItem.idMember !== null && providerCheckItem.idMember !== undefined && { idMember: providerCheckItem.idMember })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
