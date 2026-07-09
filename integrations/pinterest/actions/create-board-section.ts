import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().min(1).describe('Board ID. Example: "1099300658984851677"'),
    name: z.string().min(1).max(180).describe('Name of the board section.'),
    ad_account_id: z.string().optional().describe('Optional ad account ID for Business Access.')
});

const ProviderBoardSectionSchema = z.object({
    id: z.string().optional(),
    name: z.string()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    name: z.string()
});

const action = createAction({
    description: 'Create a board section.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read', 'boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#tag/boards/operation/board_sections/create
            endpoint: `/v5/boards/${encodeURIComponent(input.board_id)}/sections`,
            params: {
                ...(input.ad_account_id !== undefined && { ad_account_id: input.ad_account_id })
            },
            data: {
                name: input.name
            },
            retries: 1
        });

        const providerSection = ProviderBoardSectionSchema.parse(response.data);

        return {
            ...(providerSection.id !== undefined && { id: providerSection.id }),
            name: providerSection.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
