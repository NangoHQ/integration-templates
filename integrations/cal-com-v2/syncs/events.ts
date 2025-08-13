import { createSync } from 'nango';
import { Event } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Retrieve all upcoming events per a user',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/events'
        }
    ],

    models: {
        Event: Event
    },

    metadata: z.object({}),

    exec: async (nango) => {
        for await (const eventResponse of nango.paginate<Event>({
            endpoint: '/bookings',
            params: {
                ['filters[status]']: 'upcoming'
            },
            paginate: {
                response_path: 'data.bookings'
            },
            retries: 10
        })) {
            await nango.batchSave(eventResponse, 'Event');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
