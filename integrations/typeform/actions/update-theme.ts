import { z } from 'zod';
import { createAction } from 'nango';

const ColorsSchema = z.object({
    answer: z.string().optional(),
    background: z.string().optional(),
    button: z.string().optional(),
    question: z.string().optional()
});

const BackgroundSchema = z.object({
    brightness: z.number().optional(),
    href: z.string().optional(),
    layout: z.string().optional()
});

const FieldsSchema = z.object({
    alignment: z.string().optional(),
    font_size: z.string().optional()
});

const ScreensSchema = z.object({
    alignment: z.string().optional(),
    font_size: z.string().optional()
});

const InputSchema = z.object({
    theme_id: z.string().describe('Unique ID for the theme. Example: "I3NkUFrI"'),
    name: z.string().optional(),
    font: z.string().optional(),
    has_transparent_button: z.boolean().optional(),
    rounded_corners: z.string().optional(),
    colors: ColorsSchema.optional(),
    background: BackgroundSchema.optional(),
    fields: FieldsSchema.optional(),
    screens: ScreensSchema.optional(),
    origin: z.string().optional(),
    source_theme_id: z.string().optional()
});

const ProviderThemeSchema = z.object({
    background: BackgroundSchema.optional(),
    colors: ColorsSchema.optional(),
    fields: FieldsSchema.optional(),
    font: z.string().optional(),
    has_transparent_button: z.boolean().optional(),
    id: z.string(),
    name: z.string().optional(),
    origin: z.string().optional(),
    rounded_corners: z.string().optional(),
    screens: ScreensSchema.optional(),
    source_theme_id: z.string().optional(),
    visibility: z.string().optional()
});

const OutputSchema = ProviderThemeSchema;

const action = createAction({
    description: 'Partially update a theme',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['themes:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.font !== undefined) {
            data['font'] = input.font;
        }
        if (input.has_transparent_button !== undefined) {
            data['has_transparent_button'] = input.has_transparent_button;
        }
        if (input.rounded_corners !== undefined) {
            data['rounded_corners'] = input.rounded_corners;
        }
        if (input.colors !== undefined) {
            data['colors'] = input.colors;
        }
        if (input.background !== undefined) {
            data['background'] = input.background;
        }
        if (input.fields !== undefined) {
            data['fields'] = input.fields;
        }
        if (input.screens !== undefined) {
            data['screens'] = input.screens;
        }
        if (input.origin !== undefined) {
            data['origin'] = input.origin;
        }
        if (input.source_theme_id !== undefined) {
            data['source_theme_id'] = input.source_theme_id;
        }

        const response = await nango.patch({
            // https://www.typeform.com/developers/create/reference/update-theme-partial-update/
            endpoint: `/themes/${encodeURIComponent(input.theme_id)}`,
            data,
            retries: 1
        });

        const theme = ProviderThemeSchema.parse(response.data);
        return theme;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
