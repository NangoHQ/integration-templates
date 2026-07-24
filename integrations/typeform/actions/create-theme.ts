import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';
import { z } from 'zod';

const ThemeColorsSchema = z.object({
    question: z.string().describe('Color the theme will apply to questions. Example: "#FFFFFF"'),
    answer: z.string().describe('Color the theme will apply to answers. Example: "#4FB0AE"'),
    button: z.string().describe('Color the theme will apply to buttons. Example: "#4FB0AE"'),
    background: z.string().describe('Color the theme will apply to the background. Example: "#000000"')
});

const ThemeFieldsSchema = z.object({
    alignment: z.string().describe('Fields alignment. Example: "left"'),
    font_size: z.string().describe('Fields font size. Example: "medium"')
});

const ThemeScreensSchema = z.object({
    alignment: z.string().describe('Screens alignment. Example: "center"'),
    font_size: z.string().describe('Screens font size. Example: "small"')
});

const ThemeBackgroundSchema = z.object({
    brightness: z.number().optional(),
    href: z.string().optional(),
    image_id: z.union([z.string(), z.number()]).transform(String).optional(),
    layout: z.string().optional()
});

const InputSchema = z.object({
    name: z.string().describe('Name for the theme. Example: "My new theme"'),
    font: z.string().describe('Font for the theme. Example: "Karla"'),
    colors: ThemeColorsSchema,
    fields: ThemeFieldsSchema,
    screens: ThemeScreensSchema,
    background: ThemeBackgroundSchema.optional(),
    has_transparent_button: z.boolean().optional(),
    rounded_corners: z.string().optional()
});

const ProviderThemeSchema = z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    name: z.string(),
    font: z.string(),
    colors: ThemeColorsSchema,
    fields: ThemeFieldsSchema,
    screens: ThemeScreensSchema,
    visibility: z.string(),
    background: ThemeBackgroundSchema.optional(),
    has_transparent_button: z.boolean().optional(),
    origin: z.string().optional(),
    rounded_corners: z.string().optional(),
    source_theme_id: z.string().optional()
});

const OutputSchema = ProviderThemeSchema;

const action = createAction({
    description: 'Create a theme.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['themes:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.typeform.com/developers/create/reference/create-theme/
            endpoint: '/themes',
            data: {
                name: input.name,
                font: input.font,
                colors: input.colors,
                fields: input.fields,
                screens: input.screens,
                ...(input.background !== undefined && { background: input.background }),
                ...(input.has_transparent_button !== undefined && { has_transparent_button: input.has_transparent_button }),
                ...(input.rounded_corners !== undefined && { rounded_corners: input.rounded_corners })
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerTheme = ProviderThemeSchema.parse(response.data);

        return providerTheme;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
