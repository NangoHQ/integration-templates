import { createSync } from 'nango';
import { z } from 'zod';

const TagSchema = z
    .object({
        id: z.string().describe('The unique identifier of the tag'),
        type: z.string().optional().describe('The type of the object, typically "tag"'),
        summary: z.string().optional().describe('A short summary of the tag, usually its label'),
        self: z.string().optional().describe('The API URL of the tag resource'),
        html_url: z.string().optional().describe('The PagerDuty web URL for the tag'),
        label: z.string().optional().describe('The display text of the tag'),
        description: z.string().optional().describe('An optional longer description of the tag'),
        color: z.string().optional().describe('An optional hex color code for the tag')
    })
    .describe('A PagerDuty tag used to label and categorize resources');

const CheckpointSchema = z
    .object({
        offset: z.number().int().nonnegative().describe('Next offset to resume pagination from')
    })
    .describe('Pagination checkpoint for the tags full-refresh sync');

const ProviderTagSchema = z.object({
    id: z.string(),
    type: z.string().nullish(),
    summary: z.string().nullish(),
    self: z.string().nullish(),
    html_url: z.string().nullish(),
    label: z.string().nullish(),
    description: z.string().nullish(),
    color: z.string().nullish()
});

const sync = createSync({
    description: 'Sync tags',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['tags.read'],
    checkpoint: CheckpointSchema,
    models: {
        Tag: TagSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let offset: number | undefined = checkpoint?.offset ?? 0;

        await nango.trackDeletesStart('Tag');

        // https://developer.pagerduty.com/api-reference/
        for await (const page of nango.paginate({
            endpoint: '/tags',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: offset,
                limit_name_in_request: 'limit',
                limit: 25,
                response_path: 'tags',
                on_page: async (params) => {
                    offset = typeof params.nextPageParam === 'number' ? params.nextPageParam : undefined;
                }
            },
            retries: 3
        })) {
            const tags = [];

            for (const raw of page) {
                const parsed = ProviderTagSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse tag: ${parsed.error.message}`);
                }

                const record = parsed.data;
                tags.push({
                    id: record.id,
                    ...(record.type != null && { type: record.type }),
                    ...(record.summary != null && { summary: record.summary }),
                    ...(record.self != null && { self: record.self }),
                    ...(record.html_url != null && { html_url: record.html_url }),
                    ...(record.label != null && { label: record.label }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.color != null && { color: record.color })
                });
            }

            if (tags.length > 0) {
                await nango.batchSave(tags, 'Tag');
            }

            if (offset !== undefined) {
                await nango.saveCheckpoint({ offset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Tag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
