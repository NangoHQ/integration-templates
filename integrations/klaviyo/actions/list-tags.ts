import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const TagGroupRelationshipDataSchema = z
    .object({
        type: z.string(),
        id: z.string()
    })
    .optional();

const TagGroupRelationshipSchema = z
    .object({
        data: TagGroupRelationshipDataSchema
    })
    .optional();

const ProviderTagSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: z.object({
        name: z.string()
    }),
    relationships: z
        .object({
            'tag-group': TagGroupRelationshipSchema
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderTagSchema),
    links: z
        .object({
            next: z.string().nullable().optional()
        })
        .optional()
});

const TagSchema = z.object({
    id: z.string(),
    name: z.string(),
    tag_group_id: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(TagSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List tags.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.cursor !== undefined) {
            params['page[cursor]'] = input.cursor;
        }

        // https://developers.klaviyo.com/en/reference/get_tags
        const response = await nango.get({
            endpoint: '/api/tags',
            params,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const items = parsed.data.map((tag) => ({
            id: tag.id,
            name: tag.attributes.name,
            ...(tag.relationships?.['tag-group']?.data !== undefined && {
                tag_group_id: tag.relationships['tag-group'].data.id
            })
        }));

        let next_cursor: string | undefined;
        if (parsed.links?.next) {
            const url = new URL(parsed.links.next, 'https://a.klaviyo.com');
            const cursor = url.searchParams.get('page[cursor]');
            if (cursor) {
                next_cursor = cursor;
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
