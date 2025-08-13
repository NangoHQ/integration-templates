import { createSync } from 'nango';
import { Event } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Retrieve all events per a user',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

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
        const connection = await nango.getConnection();

        const userId = connection.connection_config['owner'];

        if (!userId) {
            throw new Error('No user id found');
        }

        for await (const eventResponse of nango.paginate({
            // https://developer.calendly.com/api-docs/2d5ed9bbd2952-list-events
            endpoint: '/scheduled_events',
            params: {
                user: userId
            },
            paginate: {
                response_path: 'collection',
                limit_name_in_request: 'count',
                limit: 100
            },
            retries: 10
        })) {
            const events: Event[] = [];
            const cancelledEvents: Event[] = [];
            for (const event of eventResponse) {
                if (event.status === 'canceled') {
                    cancelledEvents.push({
                        ...event,
                        id: event.uri.split('/').pop()
                    });
                } else {
                    events.push({
                        ...event,
                        id: event.uri.split('/').pop()
                    });
                }
            }

            if (cancelledEvents.length > 0) {
                await nango.batchDelete(cancelledEvents, 'Event');
            }

            if (events.length > 0) {
                await nango.batchSave(events, 'Event');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
