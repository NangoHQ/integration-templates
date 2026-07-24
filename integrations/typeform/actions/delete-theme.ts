import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    theme_id: z.string().describe('Theme ID. Example: "I3NkUFrI"')
});

const OutputSchema = z.object({
    theme_id: z.string()
});

const action = createAction({
    description: 'Delete a theme.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['themes:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.typeform.com/developers/create/reference/delete-theme/
        await nango.delete({
            endpoint: `/themes/${encodeURIComponent(input.theme_id)}`,
            retries: 3
        });

        return {
            theme_id: input.theme_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
