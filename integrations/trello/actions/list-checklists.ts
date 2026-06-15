import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    card_id: z.string().describe('The ID of the Trello card. Example: "6a26f2fdbc520ab9f45a5214"')
});

const ProviderCheckItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    idChecklist: z.string(),
    pos: z.number(),
    due: z.string().nullable().optional(),
    idMember: z.string().nullable().optional()
});

const ProviderChecklistSchema = z.object({
    id: z.string(),
    name: z.string(),
    idCard: z.string(),
    idBoard: z.string(),
    pos: z.number(),
    checkItems: z.array(ProviderCheckItemSchema)
});

const CheckItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    id_checklist: z.string(),
    pos: z.number(),
    due: z.string().optional(),
    id_member: z.string().optional()
});

const ChecklistSchema = z.object({
    id: z.string(),
    name: z.string(),
    id_card: z.string(),
    id_board: z.string(),
    pos: z.number(),
    check_items: z.array(CheckItemSchema)
});

const OutputSchema = z.object({
    checklists: z.array(ChecklistSchema)
});

const action = createAction({
    description: 'List checklists on a Trello card',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-checklists',
        group: 'Cards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-checklists-get
        const response = await nango.get({
            endpoint: `/1/cards/${encodeURIComponent(input.card_id)}/checklists`,
            params: {
                checkItems: 'all'
            },
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of checklists from the Trello API'
            });
        }

        const providerChecklists = response.data.map((checklist: unknown) => {
            const parsed = ProviderChecklistSchema.parse(checklist);
            return {
                id: parsed.id,
                name: parsed.name,
                id_card: parsed.idCard,
                id_board: parsed.idBoard,
                pos: parsed.pos,
                check_items: parsed.checkItems.map((item) => ({
                    id: item.id,
                    name: item.name,
                    state: item.state,
                    id_checklist: item.idChecklist,
                    pos: item.pos,
                    ...(item.due != null && { due: item.due }),
                    ...(item.idMember != null && { id_member: item.idMember })
                }))
            };
        });

        return {
            checklists: providerChecklists
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
