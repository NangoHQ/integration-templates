import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ids: z.array(z.string()).optional().describe('Specific board IDs to return. Example: ["5096980653"]'),
    board_kind: z.enum(['private', 'public', 'share']).optional().describe('The type of board to return.'),
    state: z.enum(['active', 'all', 'archived', 'deleted']).optional().describe('The state of the board to return. Defaults to active.'),
    workspace_ids: z.array(z.string()).optional().describe('Workspace IDs that contain the boards to return. Example: ["6502905"]'),
    limit: z.number().int().min(1).max(100).optional().describe('The number of boards to return. Defaults to 25.'),
    page: z.number().int().min(1).optional().describe('The page number to return. Starts at 1.')
});

const ProviderBoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string().optional(),
    board_kind: z.string().optional(),
    workspace_id: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            boards: z.array(z.unknown())
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    boards: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            state: z.string().optional(),
            board_kind: z.string().optional(),
            workspace_id: z.string().optional(),
            updated_at: z.string().optional()
        })
    ),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List boards from monday.com',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-boards',
        group: 'Boards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: Record<string, unknown> = {};
        if (input.ids !== undefined) {
            variables['ids'] = input.ids;
        }
        if (input.board_kind !== undefined) {
            variables['board_kind'] = input.board_kind;
        }
        if (input.state !== undefined) {
            variables['state'] = input.state;
        }
        if (input.workspace_ids !== undefined) {
            variables['workspace_ids'] = input.workspace_ids;
        }
        if (input.limit !== undefined) {
            variables['limit'] = input.limit;
        }
        if (input.page !== undefined) {
            variables['page'] = input.page;
        }

        const query = `
            query ($ids: [ID!], $board_kind: BoardKind, $state: State, $workspace_ids: [ID], $limit: Int, $page: Int) {
                boards(ids: $ids, board_kind: $board_kind, state: $state, workspace_ids: $workspace_ids, limit: $limit, page: $page) {
                    id
                    name
                    state
                    board_kind
                    workspace_id
                    updated_at
                }
            }
        `;

        // https://developer.monday.com/api-reference/reference/boards
        const response = await nango.post({
            endpoint: '/v2',
            data: {
                query: query,
                variables: variables
            },
            retries: 3
        });

        const body = response.data;

        if (body === null || body === undefined || typeof body !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from monday.com API'
            });
        }

        const parseResult = ProviderResponseSchema.safeParse(body);
        if (!parseResult.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from monday.com API'
            });
        }

        const responseData = parseResult.data;

        if (responseData.errors && responseData.errors.length > 0) {
            const firstError = responseData.errors[0];
            const errorMessage = firstError && typeof firstError === 'object' && 'message' in firstError ? String(firstError.message) : 'GraphQL error';
            throw new nango.ActionError({
                type: 'provider_error',
                message: errorMessage
            });
        }

        const boards = responseData.data?.boards;

        if (!Array.isArray(boards)) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Invalid boards response from monday.com API'
            });
        }

        const parsedBoards: Array<{ id: string; name: string; state?: string; board_kind?: string; workspace_id?: string; updated_at?: string }> = [];
        for (const board of boards) {
            const parsed = ProviderBoardSchema.safeParse(board);
            if (!parsed.success) {
                continue;
            }
            const item: { id: string; name: string; state?: string; board_kind?: string; workspace_id?: string; updated_at?: string } = {
                id: parsed.data.id,
                name: parsed.data.name
            };
            if (parsed.data.state !== undefined) {
                item.state = parsed.data.state;
            }
            if (parsed.data.board_kind !== undefined) {
                item.board_kind = parsed.data.board_kind;
            }
            if (parsed.data.workspace_id != null) {
                item.workspace_id = parsed.data.workspace_id;
            }
            if (parsed.data.updated_at != null) {
                item.updated_at = parsed.data.updated_at;
            }
            parsedBoards.push(item);
        }

        const hasMore = input.limit !== undefined && boards.length === input.limit;
        const nextPage = input.page !== undefined && hasMore ? input.page + 1 : undefined;

        return {
            boards: parsedBoards,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
