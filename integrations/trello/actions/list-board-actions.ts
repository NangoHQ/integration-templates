import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('Board ID. Example: "6a26ebb3cd5f60a53a585978"'),
    filter: z.string().optional().describe('Comma-separated action types to filter. Example: "commentCard,updateCard"'),
    limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of actions to return (max 1000).'),
    before: z.string().optional().describe('Pagination cursor: action ID or ISO date before which to return results.'),
    since: z.string().optional().describe('Action ID or ISO date after which to return results.')
});

const BoardReferenceSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        shortLink: z.string().optional()
    })
    .optional();

const CardReferenceSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        idShort: z.number().optional(),
        shortLink: z.string().optional()
    })
    .optional();

const ListReferenceSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional()
    })
    .optional();

const MemberReferenceSchema = z
    .object({
        id: z.string().optional(),
        username: z.string().optional(),
        fullName: z.string().optional()
    })
    .optional();

const ActionDataSchema = z
    .object({
        text: z.string().optional(),
        card: CardReferenceSchema,
        board: BoardReferenceSchema,
        list: ListReferenceSchema,
        listAfter: ListReferenceSchema,
        listBefore: ListReferenceSchema,
        member: MemberReferenceSchema,
        old: z.record(z.string(), z.unknown()).optional(),
        attachment: z
            .object({
                id: z.string().optional(),
                name: z.string().optional(),
                url: z.string().optional()
            })
            .optional()
    })
    .optional();

const ActionSchema = z.object({
    id: z.string(),
    idMemberCreator: z.string().optional(),
    data: ActionDataSchema,
    type: z.string(),
    date: z.string(),
    memberCreator: MemberReferenceSchema
});

const OutputSchema = z.object({
    actions: z.array(ActionSchema),
    next_cursor: z.string().optional().describe('Cursor for the next page: pass as `before` to get older actions.')
});

const action = createAction({
    description: 'List activity actions (audit log) for a Trello board.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-boardid-actions-get
            endpoint: `/1/boards/${encodeURIComponent(input.board_id)}/actions`,
            params: {
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.before !== undefined && { before: input.before }),
                ...(input.since !== undefined && { since: input.since })
            },
            retries: 3
        });

        const rawActions = z.array(z.unknown()).safeParse(response.data);
        if (!rawActions.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of actions from the Trello API.',
                data: response.data
            });
        }

        const actions: z.infer<typeof ActionSchema>[] = [];
        for (const item of rawActions.data) {
            const parsed = ActionSchema.safeParse(item);
            if (parsed.success) {
                actions.push(parsed.data);
            }
        }

        const lastAction = actions.length > 0 ? actions[actions.length - 1] : null;
        const nextCursor = lastAction != null ? lastAction.id : undefined;

        return {
            actions,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
