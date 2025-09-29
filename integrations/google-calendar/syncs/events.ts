import { createSync } from 'nango';
import type { GoogleCalendarEventsResponse } from '../types.js';
import { toEvent } from '../mappers/to-event.js';

import type { ProxyConfiguration } from 'nango';
import { GoogleCalendarEvent, CalendarMetadata } from '../models.js';

const sync = createSync({
    description: 'Sync calendar events on the primary calendar going back one month and\nsave the entire object as specified by the Google API',
    version: '4.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/events',
            group: 'Events'
        }
    ],

    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    models: {
        GoogleCalendarEvent: GoogleCalendarEvent
    },

    metadata: CalendarMetadata,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const now = new Date();
        const timeMin = metadata?.timeMin
            ? new Date(metadata.timeMin).toISOString()
            : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const timeMax = metadata?.timeMax
            ? new Date(metadata.timeMax).toISOString()
            : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

        const params: Record<string, string> = {
            maxResults: '100',
            // shows a calendar view of actual event instances
            // set to false to allow editing or canceling the full recurring series
            singleEvents: metadata?.singleEvents?.toString() ?? 'true',
            timeMin,
            timeMax
        };

        if (nango.lastSyncDate) {
            params['updatedMin'] = new Date(nango.lastSyncDate).toISOString();
        } else {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            oneMonthAgo.setHours(0, 0, 0, 0);
            params['timeMin'] = oneMonthAgo.toISOString();
        }

        const calendarsToSync = metadata?.calendarsToSync || ['primary'];

        for await (const calendarID of calendarsToSync) {
            if (calendarID) {
                const endpoint = `calendar/v3/calendars/${encodeURIComponent(calendarID)}/events`;
                const config: ProxyConfiguration = {
                    // https://developers.google.com/calendar/api/v3/reference/events/list
                    endpoint,
                    params,
                    retries: 10
                };
                for await (const eventPage of nango.paginate<GoogleCalendarEventsResponse>(config)) {
                    const mappedEvents = eventPage.map(toEvent);
                    await nango.batchSave(mappedEvents, 'GoogleCalendarEvent');
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
