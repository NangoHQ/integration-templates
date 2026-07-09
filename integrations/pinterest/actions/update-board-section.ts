import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('Board ID. Example: "1099300658984851677"'),
    section_id: z.string().describe('Section ID. Example: "3662612923485353472"'),
    name: z.string().describe('New name for the section.')
});

const ProviderSectionSchema = z.object({
    id: z.string(),
    name: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string()
});

const action = createAction({
    description: 'Update a board section.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read', 'boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developers.pinterest.com/docs/api/v5/#tag/boards/operation/board_sections/update
            endpoint: `/v5/boards/${encodeURIComponent(input.board_id)}/sections/${encodeURIComponent(input.section_id)}`,
            data: {
                name: input.name
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Board section not found or update failed.',
                board_id: input.board_id,
                section_id: input.section_id
            });
        }

        const section = ProviderSectionSchema.parse(response.data);

        return {
            id: section.id,
            name: section.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
