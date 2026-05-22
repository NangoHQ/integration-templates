import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_name: z.string().describe('The new board\'s name. Example: "My Board"'),
    board_kind: z.enum(['private', 'public', 'share']).describe('The type of board to create.'),
    description: z.string().optional().describe("The new board's description."),
    workspace_id: z.string().optional().describe('The workspace ID to create the board in. Example: "6502905"'),
    empty: z.boolean().optional().describe('Creates an empty board without any default items.'),
    folder_id: z.string().optional().describe("The board's folder ID."),
    template_id: z.string().optional().describe("The board's template ID."),
    board_owner_ids: z.array(z.string()).optional().describe('A list of user IDs who will be board owners.'),
    board_subscriber_ids: z.array(z.string()).optional().describe('A list of user IDs who will subscribe to the board.'),
    prompt: z.string().optional().describe("An AI prompt to generate the board's structure and content.")
});

const ProviderBoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    board_kind: z.string(),
    url: z.string(),
    description: z.string().nullable().optional(),
    workspace_id: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    board_kind: z.string(),
    url: z.string(),
    description: z.string().optional(),
    workspace_id: z.string().optional()
});

const action = createAction({
    description: 'Create a board in monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-board',
        group: 'Boards'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const args: string[] = [];
        args.push(`board_name: "${input.board_name.replace(/"/g, '\\"')}"`);
        args.push(`board_kind: ${input.board_kind}`);

        if (input.description !== undefined) {
            args.push(`description: "${input.description.replace(/"/g, '\\"')}"`);
        }
        if (input.workspace_id !== undefined) {
            args.push(`workspace_id: ${input.workspace_id}`);
        }
        if (input.empty !== undefined) {
            args.push(`empty: ${input.empty}`);
        }
        if (input.folder_id !== undefined) {
            args.push(`folder_id: ${input.folder_id}`);
        }
        if (input.template_id !== undefined) {
            args.push(`template_id: ${input.template_id}`);
        }
        if (input.board_owner_ids !== undefined && input.board_owner_ids.length > 0) {
            args.push(`board_owner_ids: [${input.board_owner_ids.join(', ')}]`);
        }
        if (input.board_subscriber_ids !== undefined && input.board_subscriber_ids.length > 0) {
            args.push(`board_subscriber_ids: [${input.board_subscriber_ids.join(', ')}]`);
        }
        if (input.prompt !== undefined) {
            args.push(`prompt: "${input.prompt.replace(/"/g, '\\"')}"`);
        }

        const query = `mutation { create_board(${args.join(', ')}) { id name state board_kind url description workspace_id } }`;

        // https://developer.monday.com/api-reference/reference/boards#create-a-board
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query
            },
            retries: 3
        });

        const responseData = z
            .object({
                data: z.object({
                    create_board: ProviderBoardSchema
                })
            })
            .parse(response.data);

        const board = responseData.data.create_board;

        return {
            id: board.id,
            name: board.name,
            state: board.state,
            board_kind: board.board_kind,
            url: board.url,
            ...(board.description != null && { description: board.description }),
            ...(board.workspace_id != null && { workspace_id: board.workspace_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
