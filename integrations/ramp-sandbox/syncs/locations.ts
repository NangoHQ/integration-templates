import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LocationSchema = z
    .object({
        id: z.string().describe('Unique identifier for the location. Example: f4efe11c-221f-4b49-a1e4-33eaf96a49ee'),
        name: z.string().describe('Name of the location. Example: New York City'),
        entity_id: z.string().describe('Identifier of the business entity this location belongs to. Example: bb25a7e8-cc2f-4ba7-9bf4-7730ffe152bb')
    })
    .describe('A Ramp office/work location.');

const CheckpointSchema = z.object({
    start: z.string().describe('Ramp pagination cursor extracted from `page.next`, or an empty string when no full refresh is in progress.')
});

const sync = createSync({
    description: 'Sync office/work locations.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Location: LocationSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let start = typeof checkpoint?.['start'] === 'string' && checkpoint['start'] !== '' ? checkpoint['start'] : undefined;

        // Ramp exposes only cursor pagination here, not a changed-since filter. Keep this as a
        // full refresh, but persist the cursor so an interrupted scan can resume mid-walk.
        await nango.trackDeletesStart('Location');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/api/locations
            endpoint: '/developer/v1/locations',
            params: {
                ...(start !== undefined ? { start } : {})
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'page.next',
                response_path: 'data',
                limit_name_in_request: 'page_size',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    start =
                        typeof nextPageParam === 'string' ? (new URL(nextPageParam, 'https://ramp.invalid').searchParams.get('start') ?? undefined) : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const locations = z.array(LocationSchema).parse(page);

            if (locations.length === 0) {
                continue;
            }

            await nango.batchSave(locations, 'Location');

            if (start !== undefined) {
                await nango.saveCheckpoint({ start });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Location');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
