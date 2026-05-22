import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('The board ID that contains the group. Example: "5096980653"'),
    group_id: z.string().describe('The group ID to retrieve. Example: "topics"')
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    title: z.string(),
    color: z.string(),
    position: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    color: z.string(),
    position: z.string()
});

const action = createAction({
    description: 'Retrieve a single group from monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!/^\d+$/.test(input.board_id)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'board_id must be a numeric string'
            });
        }

        const query = `query {
            boards(ids: [${input.board_id}]) {
                groups(ids: [${JSON.stringify(input.group_id)}]) {
                    id
                    title
                    color
                    position
                }
            }
        }`;

        // https://developer.monday.com/api-reference/reference/groups
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

        const responseData = response.data;
        if (
            typeof responseData !== 'object' ||
            responseData === null ||
            !('data' in responseData) ||
            typeof responseData.data !== 'object' ||
            responseData.data === null ||
            !('boards' in responseData.data)
        ) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from monday.com API'
            });
        }

        const boards = responseData.data.boards;
        if (!Array.isArray(boards) || boards.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Board not found: ${input.board_id}`
            });
        }

        const board = boards[0];
        if (typeof board !== 'object' || board === null || !('groups' in board) || !Array.isArray(board.groups) || board.groups.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Group not found: ${input.group_id}`
            });
        }

        const providerGroup = ProviderGroupSchema.parse(board.groups[0]);

        return {
            id: providerGroup.id,
            title: providerGroup.title,
            color: providerGroup.color,
            position: providerGroup.position
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
