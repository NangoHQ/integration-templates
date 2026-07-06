import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderTemplateSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    attributes: z
        .object({
            name: z.string().optional(),
            editor_type: z.string().optional(),
            created: z.string().optional(),
            updated: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderTemplateSchema).optional().default([]),
    links: z
        .object({
            next: z.string().nullable().optional(),
            prev: z.string().nullable().optional(),
            self: z.string().nullable().optional()
        })
        .optional()
});

const TemplateSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    editor_type: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(TemplateSchema),
    next_cursor: z.string().optional()
});

function extractCursorFromUrl(url: string): string | null {
    // @allowTryCatch Malformed URLs from the provider should not crash the action; fall back to no cursor.
    try {
        const parsed = new URL(url);
        return parsed.searchParams.get('page[cursor]');
    } catch {
        return null;
    }
}

const action = createAction({
    description: 'List templates.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['templates:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.klaviyo.com/en/reference/get_templates
            endpoint: '/api/templates',
            headers: {
                revision: '2026-04-15'
            },
            params: {
                ...(input.cursor !== undefined && { 'page[cursor]': input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Klaviyo API'
            });
        }

        const providerData = parsed.data;

        const items = providerData.data.map((item) => ({
            id: item.id,
            ...(item.attributes?.name !== undefined && { name: item.attributes.name }),
            ...(item.attributes?.editor_type !== undefined && { editor_type: item.attributes.editor_type }),
            ...(item.attributes?.created !== undefined && { created: item.attributes.created }),
            ...(item.attributes?.updated !== undefined && { updated: item.attributes.updated })
        }));

        const nextCursor =
            providerData.links?.next && typeof providerData.links.next === 'string' ? extractCursorFromUrl(providerData.links.next) || undefined : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
