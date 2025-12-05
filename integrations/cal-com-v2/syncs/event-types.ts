import { createSync } from 'nango';
import type { EventTypeResponse } from '../types.js';

import { EventType } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Retrieve all event types per a user',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

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
        const response = await nango.get<EventTypeResponse>({
            endpoint: '/event-types',
            retries: 10
        });

        const { data } = response.data;
        const { eventTypeGroups } = data;
        const eventTypes: EventType[] = [];
        for (const group of eventTypeGroups) {
            eventTypes.push(...group.eventTypes);
        }

        if (eventTypes.length) {
            await nango.batchSave(eventTypes, 'EventType');
        }

        await nango.deleteRecordsFromPreviousExecutions('EventType');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
