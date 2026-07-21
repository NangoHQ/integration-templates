import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    theme_id: z.string().describe('Unique ID for the theme. Example: "I3NkUFrI"')
});

const BackgroundSchema = z.object({
    brightness: z.number().optional(),
    href: z.string().optional(),
    image_id: z.union([z.string(), z.number()]).transform(String).optional(),
    layout: z.string().optional()
});

const ColorsSchema = z.object({
    answer: z.string().optional(),
    background: z.string().optional(),
    button: z.string().optional(),
    question: z.string().optional()
});

const FieldsSchema = z.object({
    alignment: z.string().optional(),
    font_size: z.string().optional()
});

const ScreensSchema = z.object({
    alignment: z.string().optional(),
    font_size: z.string().optional()
});

const OutputSchema = z.object({
    id: z.union([z.string(), z.number()]).transform(String).describe('Unique ID of the theme.'),
    name: z.string().describe('Name of the theme.'),
    font: z.string().optional(),
    colors: ColorsSchema.optional(),
    background: BackgroundSchema.optional(),
    fields: FieldsSchema.optional(),
    screens: ScreensSchema.optional(),
    has_transparent_button: z.boolean().optional(),
    rounded_corners: z.string().optional(),
    visibility: z.string().optional(),
    origin: z.string().optional(),
    source_theme_id: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a theme.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['themes:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.typeform.com/developers/create/reference/retrieve-theme/
            endpoint: `/themes/${encodeURIComponent(input.theme_id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Theme not found or unexpected response format',
                theme_id: input.theme_id
            });
        }

        const theme = OutputSchema.parse(response.data);
        return theme;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
