import { createSync } from 'nango';
import { Event } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Retrieve all upcoming events per a user',
    version: '2.1.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/events'
        }
    ],

    checkpoint: CheckpointSchema,

    models: {
        Event: Event
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let cursor: string | undefined = checkpoint?.cursor;

        await nango.trackDeletesStart('Event');

        // https://cal.com/docs/api-reference/v2/bookings/get-all-bookings
        for await (const eventResponse of nango.paginate<Event>({
            endpoint: '/bookings',
            params: {
                ['filters[status]']: 'upcoming',
                ...(cursor && { cursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'pagination.nextCursor',
                response_path: 'data.bookings',
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 10
        })) {
            await nango.batchSave(eventResponse, 'Event');

            if (cursor !== undefined) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Event');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
