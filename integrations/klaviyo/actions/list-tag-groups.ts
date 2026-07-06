import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderTagGroupSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: z.object({
        name: z.string(),
        default: z.boolean(),
        exclusive: z.boolean()
    })
});

const TagGroupSchema = z.object({
    id: z.string(),
    name: z.string(),
    default: z.boolean(),
    exclusive: z.boolean()
});

const OutputSchema = z.object({
    items: z.array(TagGroupSchema),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    links: z
        .object({
            next: z.string().nullable().optional()
        })
        .passthrough()
        .optional()
});

const action = createAction({
    description: 'List tag groups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.klaviyo.com/en/reference/get_tag_groups
            endpoint: '/api/tag-groups',
            params: {
                ...(input.cursor && { 'page[cursor]': input.cursor })
            },
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const raw = ProviderResponseSchema.parse(response.data);

        const items = raw.data.map((item) => {
            const parsed = ProviderTagGroupSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse tag group from provider response.'
                });
            }
            return {
                id: parsed.data.id,
                name: parsed.data.attributes.name,
                default: parsed.data.attributes.default,
                exclusive: parsed.data.attributes.exclusive
            };
        });

        const nextLink = raw.links?.next;
        let nextCursor: string | undefined;
        if (nextLink) {
            // @allowTryCatch URL parsing may fail on malformed pagination links
            try {
                nextCursor = new URL(nextLink).searchParams.get('page[cursor]') ?? undefined;
            } catch {
                nextCursor = undefined;
            }
        }

        return {
            items,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
