import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderThemeSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    font: z.string().nullish(),
    has_transparent_button: z.boolean().nullish(),
    origin: z.string().nullish(),
    rounded_corners: z.string().nullish(),
    source_theme_id: z.string().nullish(),
    visibility: z.string().nullish(),
    background: z
        .object({
            brightness: z.number().nullish(),
            href: z.string().nullish(),
            layout: z.string().nullish()
        })
        .nullish(),
    colors: z
        .object({
            answer: z.string().nullish(),
            background: z.string().nullish(),
            button: z.string().nullish(),
            question: z.string().nullish()
        })
        .nullish(),
    fields: z
        .object({
            alignment: z.string().nullish(),
            font_size: z.string().nullish()
        })
        .nullish(),
    screens: z
        .object({
            alignment: z.string().nullish(),
            font_size: z.string().nullish()
        })
        .nullish()
});

type ProviderTheme = z.infer<typeof ProviderThemeSchema>;

const ThemeSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    font: z.string().optional(),
    has_transparent_button: z.boolean().optional(),
    origin: z.string().optional(),
    rounded_corners: z.string().optional(),
    source_theme_id: z.string().optional(),
    visibility: z.string().optional(),
    background: z
        .object({
            brightness: z.number().optional(),
            href: z.string().optional(),
            layout: z.string().optional()
        })
        .optional(),
    colors: z
        .object({
            answer: z.string().optional(),
            background: z.string().optional(),
            button: z.string().optional(),
            question: z.string().optional()
        })
        .optional(),
    fields: z
        .object({
            alignment: z.string().optional(),
            font_size: z.string().optional()
        })
        .optional(),
    screens: z
        .object({
            alignment: z.string().optional(),
            font_size: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

function mapTheme(theme: ProviderTheme) {
    return {
        id: theme.id,
        ...(theme.name != null && { name: theme.name }),
        ...(theme.font != null && { font: theme.font }),
        ...(theme.has_transparent_button != null && { has_transparent_button: theme.has_transparent_button }),
        ...(theme.origin != null && { origin: theme.origin }),
        ...(theme.rounded_corners != null && { rounded_corners: theme.rounded_corners }),
        ...(theme.source_theme_id != null && { source_theme_id: theme.source_theme_id }),
        ...(theme.visibility != null && { visibility: theme.visibility }),
        ...(theme.background != null && {
            background: {
                ...(theme.background.brightness != null && { brightness: theme.background.brightness }),
                ...(theme.background.href != null && { href: theme.background.href }),
                ...(theme.background.layout != null && { layout: theme.background.layout })
            }
        }),
        ...(theme.colors != null && {
            colors: {
                ...(theme.colors.answer != null && { answer: theme.colors.answer }),
                ...(theme.colors.background != null && { background: theme.colors.background }),
                ...(theme.colors.button != null && { button: theme.colors.button }),
                ...(theme.colors.question != null && { question: theme.colors.question })
            }
        }),
        ...(theme.fields != null && {
            fields: {
                ...(theme.fields.alignment != null && { alignment: theme.fields.alignment }),
                ...(theme.fields.font_size != null && { font_size: theme.fields.font_size })
            }
        }),
        ...(theme.screens != null && {
            screens: {
                ...(theme.screens.alignment != null && { alignment: theme.screens.alignment }),
                ...(theme.screens.font_size != null && { font_size: theme.screens.font_size })
            }
        })
    };
}

const sync = createSync({
    description: 'Sync themes.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Theme: ThemeSchema
    },
    scopes: ['themes:read'],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let page = checkpoint?.page ?? 1;
        const isResumed = checkpoint != null && checkpoint.page > 1;

        if (!isResumed) {
            await nango.trackDeletesStart('Theme');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.typeform.com/developers/create/reference/retrieve-themes/
            endpoint: '/themes',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 200,
                response_path: 'items'
            },
            retries: 3
        };

        for await (const themes of nango.paginate(proxyConfig)) {
            if (!Array.isArray(themes)) {
                throw new Error('Unexpected non-array response from themes endpoint');
            }

            const mapped: Array<z.infer<typeof ThemeSchema>> = [];
            for (const item of themes) {
                const result = ProviderThemeSchema.safeParse(item);
                if (!result.success) {
                    throw new Error(`Failed to parse theme: ${JSON.stringify(result.error.issues)}`);
                }
                mapped.push(mapTheme(result.data));
            }

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Theme');
            }

            page = page + 1;
            await nango.saveCheckpoint({ page });
        }

        await nango.trackDeletesEnd('Theme');

        await nango.saveCheckpoint({ page: 1 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
