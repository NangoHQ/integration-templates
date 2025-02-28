import type { NangoSync, OutlookCalendarEvent, ProxyConfiguration } from '../../models';

export default async function fetchData(nango: NangoSync): Promise<void> {
    // Date range from 1 month ago to future events
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    oneMonthAgo.setHours(0, 0, 0, 0);
    const timeMin = oneMonthAgo.toISOString();

    const config: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/api/user-list-events?view=graph-rest-1.0&tabs=http
        endpoint: '/v1.0/me/events',
        params: {
            $top: '100', // Max number of events per page
            $select:
                'id,subject,bodyPreview,importance,sensitivity,start,end,location,isAllDay,isCancelled,isOrganizer,recurrence,responseRequested,responseStatus,attendees,organizer,webLink,onlineMeeting,onlineMeetingProvider',
            $filter: `start/dateTime ge '${timeMin}'`, // Filter events after the specified time
            $orderby: 'start/dateTime asc' // Order by start time
        },
        paginate: {
            type: 'link',
            response_path: 'value',
            link_path_in_response_body: '@odata.nextLink',
            limit: 100
        },
        retries: 10
    };

    for await (const eventsPage of nango.paginate<OutlookCalendarEvent>(config)) {
        const processedEvents = eventsPage.map((event: any) => {
            // Remove OData metadata properties
            delete event['@odata.etag'];
            delete event['@odata.id'];
            return event;
        });

        if (processedEvents.length > 0) {
            await nango.batchSave<OutlookCalendarEvent>(processedEvents, 'OutlookCalendarEvent');
        }
    }
}
