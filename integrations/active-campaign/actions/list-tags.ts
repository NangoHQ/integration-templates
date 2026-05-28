import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results to display per page. Default: 20; max: 100.'),
    search: z.string().optional().describe('Filter by name of tag(s).')
});

const TagSchema = z.object({
    id: z.string(),
    tag: z.string(),
    tagType: z.string(),
    description: z.string().optional(),
    cdate: z.string().optional(),
    subscriber_count: z.string().optional(),
    links: z
        .object({
            contactGoalTags: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    tags: z.array(TagSchema),
    next_cursor: z.string().optional()
});

const ProviderTagSchema = z.object({
    id: z.string(),
    tag: z.string(),
    tagType: z.string(),
    description: z.string().optional().nullable(),
    cdate: z.string().optional().nullable(),
    subscriber_count: z.string().optional().nullable(),
    links: z
        .object({
            contactGoalTags: z.string().optional().nullable()
        })
        .optional()
        .nullable()
});

const ProviderResponseSchema = z.object({
    tags: z.array(ProviderTagSchema),
    meta: z
        .object({
            total: z.string()
        })
        .optional()
});

const action = createAction({
    description: 'List tags from ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-tags',
        group: 'Tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 20;
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        const response = await nango.get({
            // https://developers.activecampaign.com/reference/retrieve-all-tags
            endpoint: '/3/tags',
            params: {
                limit: String(limit),
                offset: String(offset),
                ...(input.search && { search: input.search })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const tags = providerResponse.tags.map((tag) => ({
            id: tag.id,
            tag: tag.tag,
            tagType: tag.tagType,
            ...(tag.description != null && { description: tag.description }),
            ...(tag.cdate != null && { cdate: tag.cdate }),
            ...(tag.subscriber_count != null && { subscriber_count: tag.subscriber_count }),
            ...(tag.links != null && {
                links: {
                    ...(tag.links.contactGoalTags != null && { contactGoalTags: tag.links.contactGoalTags })
                }
            })
        }));

        const total = parseInt(providerResponse.meta?.total ?? '0', 10);
        const nextOffset = offset + tags.length;
        const next_cursor = nextOffset < total ? String(nextOffset) : undefined;

        return {
            tags,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
