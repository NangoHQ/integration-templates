import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('The unique identifier of the board to retrieve. Example: "5096980653"')
});

const WorkspaceSchema = z.object({
    id: z.string(),
    name: z.string()
});

const GroupSchema = z.object({
    id: z.string(),
    title: z.string(),
    color: z.string().optional(),
    position: z.string().optional()
});

const ColumnSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.string()
});

const ProviderBoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string().optional(),
    board_kind: z.string().optional(),
    description: z.string().optional(),
    updated_at: z.string().optional(),
    created_at: z.string().optional(),
    workspace: WorkspaceSchema.optional(),
    groups: z.array(GroupSchema).optional(),
    columns: z.array(ColumnSchema).optional(),
    items_count: z.number().optional()
});

const BoardsResponseSchema = z.object({
    data: z.object({
        boards: z.array(ProviderBoardSchema)
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string().optional(),
    board_kind: z.string().optional(),
    description: z.string().optional(),
    updated_at: z.string().optional(),
    created_at: z.string().optional(),
    workspace: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    groups: z
        .array(
            z.object({
                id: z.string(),
                title: z.string(),
                color: z.string().optional(),
                position: z.string().optional()
            })
        )
        .optional(),
    columns: z
        .array(
            z.object({
                id: z.string(),
                title: z.string(),
                type: z.string()
            })
        )
        .optional(),
    items_count: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single board from monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-board',
        group: 'Boards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query {
                boards(ids: [${input.board_id}]) {
                    id
                    name
                    state
                    board_kind
                    description
                    updated_at
                    created_at
                    workspace {
                        id
                        name
                    }
                    groups {
                        id
                        title
                        color
                        position
                    }
                    columns {
                        id
                        title
                        type
                    }
                    items_count
                }
            }
        `;

        // https://developer.monday.com/api-reference/reference/boards
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: query
            },
            retries: 3
        });

        const parsed = BoardsResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from monday.com API',
                details: parsed.error.message
            });
        }

        const boards = parsed.data.data.boards;
        if (boards.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Board with id "${input.board_id}" was not found.`,
                board_id: input.board_id
            });
        }

        const board = boards[0];
        if (board === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Board with id "${input.board_id}" was not found.`,
                board_id: input.board_id
            });
        }

        return {
            id: board.id,
            name: board.name,
            ...(board.state !== undefined && { state: board.state }),
            ...(board.board_kind !== undefined && { board_kind: board.board_kind }),
            ...(board.description !== undefined && { description: board.description }),
            ...(board.updated_at !== undefined && { updated_at: board.updated_at }),
            ...(board.created_at !== undefined && { created_at: board.created_at }),
            ...(board.workspace !== undefined && {
                workspace: {
                    id: board.workspace.id,
                    name: board.workspace.name
                }
            }),
            ...(board.groups !== undefined && {
                groups: board.groups.map((group) => ({
                    id: group.id,
                    title: group.title,
                    ...(group.color !== undefined && { color: group.color }),
                    ...(group.position !== undefined && { position: group.position })
                }))
            }),
            ...(board.columns !== undefined && {
                columns: board.columns.map((column) => ({
                    id: column.id,
                    title: column.title,
                    type: column.type
                }))
            }),
            ...(board.items_count !== undefined && { items_count: board.items_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
