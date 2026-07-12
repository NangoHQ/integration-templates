import { createAction } from 'nango';
import type { NangoAction, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    board_id: z.string().describe('The unique identifier of the board containing the section.'),
    section_id: z.string().describe('The unique identifier of the section to delete.')
});

const OutputSchema = z.object({
    success: z.literal(true).describe('Indicates the section was successfully deleted.')
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

export default createAction({
    description: 'Delete a board section.',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],
    exec: async (nango: NangoAction, input: Input): Promise<Output> => {
        const parsed = InputSchema.safeParse(input);
        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Invalid input',
                details: parsed.error.issues
            });
        }

        const { board_id, section_id } = parsed.data;

        const config: ProxyConfiguration = {
            // Docs: https://developers.pinterest.com/docs/api/v5/#operation/board_sections/delete
            endpoint: `/v5/boards/${encodeURIComponent(board_id)}/sections/${encodeURIComponent(section_id)}`,
            retries: 3
        };

        await nango.delete(config);

        return { success: true };
    }
});
