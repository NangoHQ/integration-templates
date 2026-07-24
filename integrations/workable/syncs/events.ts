import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MemberSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string()
});

const JobSchema = z.object({
    shortcode: z.string(),
    title: z.string()
});

const CandidateSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ConferenceSchema = z.object({
    type: z.string(),
    id: z.union([z.string(), z.number()]),
    url: z.string()
});

const EventSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullish(),
    type: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    cancelled: z.boolean().optional(),
    job: JobSchema.nullish(),
    members: z.array(MemberSchema).optional(),
    candidate: CandidateSchema.nullish(),
    conference: ConferenceSchema.nullish()
});

const CheckpointSchema = z.object({
    next_page: z.string()
});

const sync = createSync({
    description: 'Sync scheduled recruiting events (calls, interviews, meetings).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['r_jobs'],
    checkpoint: CheckpointSchema,
    models: {
        Event: EventSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { next_page: '' });
        let nextPage = checkpoint.next_page;
        const params: Record<string, string | number> = {
            limit: 50
        };

        if (checkpoint.next_page) {
            const nextUrl = new URL(checkpoint.next_page);
            for (const [key, value] of nextUrl.searchParams.entries()) {
                params[key] = value;
            }
            if (!('limit' in params)) {
                params['limit'] = 50;
            }
        }

        // The /events endpoint does not support updated_after or created_after
        // filters, so each successful run still pages through the full collection.
        // The checkpoint only resumes an interrupted full crawl.
        const proxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/events
            endpoint: '/spi/v3/events',
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                response_path: 'events',
                limit_name_in_request: 'limit',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retryOn: [404, 429],
            retries: 3
        };

        let sawPage = false;
        for await (const events of nango.paginate(proxyConfig)) {
            sawPage = true;
            const parsed = z.array(EventSchema).safeParse(events);
            if (!parsed.success) {
                throw new Error(`Failed to parse events: ${parsed.error.message}`);
            }

            if (parsed.data.length > 0) {
                await nango.batchSave(parsed.data, 'Event');
            }

            if (nextPage) {
                await nango.saveCheckpoint({ next_page: nextPage });
            }
        }

        if (sawPage || checkpoint.next_page) {
            await nango.saveCheckpoint({ next_page: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
