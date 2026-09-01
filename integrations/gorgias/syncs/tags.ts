import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TagDecorationSchema = z
    .object({
        color: z.string().optional().describe('The hex color code of the tag, e.g. #F58D86.')
    })
    .describe('Visual style information for a tag.');

const TagSchema = z
    .object({
        id: z.string().describe('The unique identifier of the tag.'),
        name: z.string().describe('The case-sensitive name of the tag.'),
        description: z.string().optional().describe('A short description of the tag.'),
        usage: z.number().optional().describe('The number of tickets associated with this tag.'),
        uri: z.string().optional().describe('The API URI of the tag.'),
        created_datetime: z.string().optional().describe('The ISO 8601 timestamp when the tag was created.'),
        deleted_datetime: z.string().optional().describe('The ISO 8601 timestamp when the tag was deleted, if applicable.'),
        decoration: TagDecorationSchema.optional().describe('Visual style information for the tag.')
    })
    .describe('A tag used to group tickets sharing common characteristics.');

const ProviderTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullish(),
    usage: z.number().nullish(),
    uri: z.string().nullish(),
    created_datetime: z.string().nullish(),
    deleted_datetime: z.string().nullish(),
    decoration: z
        .object({
            color: z.string().nullish()
        })
        .nullish()
});

const sync = createSync({
    description: 'Sync tags.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Tag: TagSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Tag');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-tags
            endpoint: '/api/tags',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const validated = z.array(ProviderTagSchema).parse(page);
            const tags = validated.map((tag) => ({
                id: String(tag.id),
                name: tag.name,
                ...(tag.description != null && { description: tag.description }),
                ...(tag.usage != null && { usage: tag.usage }),
                ...(tag.uri != null && { uri: tag.uri }),
                ...(tag.created_datetime != null && { created_datetime: tag.created_datetime }),
                ...(tag.deleted_datetime != null && { deleted_datetime: tag.deleted_datetime }),
                ...(tag.decoration?.color != null && { decoration: { color: tag.decoration.color } })
            }));

            if (tags.length > 0) {
                await nango.batchSave(tags, 'Tag');
            }
        }

        await nango.trackDeletesEnd('Tag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
