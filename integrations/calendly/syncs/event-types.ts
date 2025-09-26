import { createSync } from 'nango';
import { EventType } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Retrieve all event types per a user',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/event/types'
        }
    ],

    models: {
        EventType: EventType
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const connection = await nango.getConnection();

        const userId = connection.connection_config['owner'];

        if (!userId) {
            throw new Error('No user id found');
        }

        for await (const eventTypes of nango.paginate({
            // https://developer.calendly.com/api-docs/25a4ece03c1bc-list-user-s-event-types
            endpoint: '/event_types',
            params: {
                user: userId
            },
            paginate: {
                response_path: 'collection'
            },
            retries: 10
        })) {
            const eventTypeData = eventTypes.map((eventType) => {
                return {
                    ...eventType,
                    id: eventType.uri.split('/').pop()
                };
            });

            await nango.batchSave(eventTypeData, 'EventType');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
