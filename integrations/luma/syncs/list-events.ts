import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import type { LumaEvent } from '../types.js';
import { toEvent } from '../mappers/to-event.js';

import { Event } from '../models.js';
import { z } from 'zod';

/**
 * Fetches events from a specified endpoint and processes them for synchronization.
 * Uses pagination and retries for robust data retrieval and saving.
 * Convert LumaEvent to Event using mapping function.
 *
 * @param nango An instance of NangoSync for handling synchronization tasks.
 * @returns Promise that resolves when all events are fetched and saved.
 */
const sync = createSync({
    description:
        'This sync will be used to sync all of the events managed by your Calendar. See https://docs.lu.ma/reference/calendar-list-events for more details.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/luma/list-events'
        }
    ],

    models: {
        Event: Event
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://docs.lu.ma/reference/get_public-v1-calendar-list-events
            endpoint: '/public/v1/calendar/list-events',
            // Include 'after' parameter with the lastSyncDate if available
            ...(nango.lastSyncDate ? { params: { after: nango.lastSyncDate?.toISOString() } } : {}),
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next_cursor',
                cursor_name_in_request: 'pagination_cursor',
                response_path: 'entries',
                limit_name_in_request: 'pagination_limit',
                limit: 100
            },
            retries: 10
        };

        for await (const events of nango.paginate<LumaEvent>(config)) {
            const formattedEvents = events.map((event: LumaEvent) => toEvent(event));
            await nango.batchSave(formattedEvents, 'Event');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
